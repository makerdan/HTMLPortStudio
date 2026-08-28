import { Router, type IRouter } from "express";
import {
  GetGithubRepositoryQueryParams,
  GetGithubRepositoryResponse,
  ImportGithubRepositoryBody,
  ImportGithubRepositoryResponse,
} from "@workspace/api-zod";
import { analyzeBundle, type SourceBundle } from "./port";
import {
  entrypointCandidates,
  GithubError,
  isIgnoredPath,
  isSafeGithubPath,
  isSafeGithubRef,
  isSupportedTextPath,
  parseGithubUrl,
  pathDepth,
  type GithubRepoCoordinates,
} from "./github-utils";

const router: IRouter = Router();
const GITHUB_API = "https://api.github.com";
const MAX_GITHUB_FILES = 80;
const MAX_GITHUB_DEPTH = 6;
const MAX_GITHUB_FILE_BYTES = 800_000;
const MAX_GITHUB_TOTAL_BYTES = 1_800_000;
const MAX_GITHUB_TREE_RESPONSE_BYTES = 6_000_000;
const MAX_GITHUB_BLOB_RESPONSE_BYTES = 1_200_000;
const MAX_GITHUB_REFS = 100;

type GithubRepository = {
  sourceUrl: string;
  fullName: string;
  displayName: string;
  defaultBranch: string;
  description: string | null;
  stars: number;
  refs: Array<{ name: string; sha: string }>;
};

function githubApiUrl(path: string): URL {
  return new URL(path, GITHUB_API);
}

async function readLimitedText(response: Response, limit: number): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > limit) {
    throw new GithubError(
      413,
      "GITHUB_RESPONSE_TOO_LARGE",
      "GitHub returned a response larger than the importer limit.",
      "Choose a smaller repository or try again with a narrower source.",
    );
  }

  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > limit) {
      throw new GithubError(
        413,
        "GITHUB_RESPONSE_TOO_LARGE",
        "GitHub returned a response larger than the importer limit.",
      );
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new GithubError(
          413,
          "GITHUB_RESPONSE_TOO_LARGE",
          "GitHub returned a response larger than the importer limit.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function githubRequest(
  path: string,
  maxResponseBytes: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(githubApiUrl(path), {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "HTML-Port-Studio-public-importer",
      },
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof GithubError) throw error;
    throw new GithubError(
      503,
      "GITHUB_UNAVAILABLE",
      "GitHub could not be reached right now.",
      "Check your connection and retry. GitHub credentials are not required.",
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status >= 300 && response.status < 400) {
    throw new GithubError(
      503,
      "GITHUB_REDIRECT_BLOCKED",
      "GitHub returned an unexpected redirect, so the read-only import was stopped.",
      "Retry from the canonical https://github.com repository URL.",
    );
  }

  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (response.status === 429 || (response.status === 403 && remaining === "0")) {
      throw new GithubError(
        429,
        "GITHUB_RATE_LIMITED",
        "GitHub's public API rate limit was reached.",
        "Wait a little, then retry. This importer never asks for GitHub credentials.",
      );
    }
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new GithubError(
        404,
        "GITHUB_REPOSITORY_NOT_FOUND",
        "That repository or ref was not found, or the repository is private.",
        "Only public GitHub repositories are supported; check the URL and selected ref.",
      );
    }
    throw new GithubError(
      503,
      "GITHUB_UNAVAILABLE",
      `GitHub returned ${response.status} while preparing the import.`,
      "Retry the import later.",
    );
  }

  try {
    return JSON.parse(await readLimitedText(response, maxResponseBytes)) as unknown;
  } catch (error) {
    if (error instanceof GithubError) throw error;
    throw new GithubError(
      503,
      "GITHUB_INVALID_RESPONSE",
      "GitHub returned an unreadable response.",
      "Retry the import later.",
    );
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

async function loadRepository(
  coordinates: GithubRepoCoordinates,
): Promise<GithubRepository> {
  const repoPath = `/repos/${encodeURIComponent(coordinates.owner)}/${encodeURIComponent(coordinates.repo)}`;
  const metadata = objectValue(await githubRequest(repoPath, 250_000));
  if (metadata.private === true) {
    throw new GithubError(
      404,
      "GITHUB_REPOSITORY_NOT_FOUND",
      "That repository is private. Only public GitHub repositories can be imported.",
      "Choose a public repository; GitHub credentials are not requested.",
    );
  }

  const defaultBranch = stringValue(metadata.default_branch);
  const fullName = stringValue(metadata.full_name);
  if (!defaultBranch || !fullName) {
    throw new GithubError(
      404,
      "GITHUB_REPOSITORY_NOT_FOUND",
      "GitHub did not return usable public repository metadata.",
      "Check the URL and retry.",
    );
  }

  const branchData = await githubRequest(
    `${repoPath}/branches?per_page=${MAX_GITHUB_REFS}`,
    500_000,
  );
  const refs = Array.isArray(branchData)
    ? branchData
        .map((item) => {
          const branch = objectValue(item);
          const commit = objectValue(branch.commit);
          const name = stringValue(branch.name);
          const sha = stringValue(commit.sha);
          return name && sha ? { name, sha } : null;
        })
        .filter((ref): ref is { name: string; sha: string } => ref !== null)
        .slice(0, MAX_GITHUB_REFS)
    : [];

  if (!refs.some((ref) => ref.name === defaultBranch)) {
    refs.unshift({ name: defaultBranch, sha: "unresolved" });
  }

  return {
    sourceUrl: coordinates.sourceUrl,
    fullName,
    displayName: stringValue(metadata.name) ?? fullName,
    defaultBranch,
    description: stringValue(metadata.description),
    stars: typeof metadata.stargazers_count === "number" ? metadata.stargazers_count : 0,
    refs,
  };
}

function errorResponse(error: unknown) {
  if (error instanceof GithubError) {
    return {
      status: error.status,
      body: { error: error.message, code: error.code, ...(error.action ? { action: error.action } : {}) },
    };
  }
  return {
    status: 503,
    body: {
      error: "GitHub could not be reached while preparing the import.",
      code: "GITHUB_UNAVAILABLE",
      action: "Retry the read-only import. GitHub credentials are not required.",
    },
  };
}

router.get("/port/github/repository", async (req, res): Promise<void> => {
  const parsed = GetGithubRepositoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Provide a GitHub repository URL.",
      code: "GITHUB_URL_INVALID",
      action: "Use a public URL such as https://github.com/owner/repository.",
    });
    return;
  }

  try {
    const coordinates = parseGithubUrl(parsed.data.url);
    res.json(GetGithubRepositoryResponse.parse(await loadRepository(coordinates)));
  } catch (error) {
    const result = errorResponse(error);
    res.status(result.status).json(result.body);
  }
});

router.post("/port/github/import", async (req, res): Promise<void> => {
  const parsed = ImportGithubRepositoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Provide a GitHub repository URL and an explicit branch or commit.",
      code: "GITHUB_IMPORT_INPUT_INVALID",
      action: "Choose a listed branch or enter an immutable commit SHA.",
    });
    return;
  }

  try {
    const coordinates = parseGithubUrl(parsed.data.url);
    if (!isSafeGithubRef(parsed.data.ref)) {
      throw new GithubError(
        400,
        "GITHUB_REF_INVALID",
        "That branch or commit selection is not supported.",
        "Choose a branch from the list or enter a commit SHA without query characters.",
      );
    }

    const repository = await loadRepository(coordinates);
    const repoPath = `/repos/${encodeURIComponent(coordinates.owner)}/${encodeURIComponent(coordinates.repo)}`;
    const commit = objectValue(
      await githubRequest(`${repoPath}/commits/${encodeURIComponent(parsed.data.ref)}`, 250_000),
    );
    const resolvedCommitSha = stringValue(commit.sha);
    if (!resolvedCommitSha || !/^[a-f0-9]{7,64}$/i.test(resolvedCommitSha)) {
      throw new GithubError(
        404,
        "GITHUB_REF_NOT_FOUND",
        "That branch or commit could not be resolved.",
        "Choose an available branch or a complete commit SHA, then retry.",
      );
    }

    const tree = objectValue(
      await githubRequest(
        `${repoPath}/git/trees/${encodeURIComponent(resolvedCommitSha)}?recursive=1`,
        MAX_GITHUB_TREE_RESPONSE_BYTES,
      ),
    );
    if (tree.truncated === true) {
      throw new GithubError(
        413,
        "GITHUB_SNAPSHOT_TOO_LARGE",
        "GitHub could not return the complete repository tree within the importer limit.",
        "Choose a smaller repository or a narrower repository snapshot.",
      );
    }

    const treeEntries = Array.isArray(tree.tree) ? tree.tree : [];
    const supportedEntries = treeEntries
      .map((entry) => {
        const item = objectValue(entry);
        const path = stringValue(item.path);
        const type = stringValue(item.type);
        const size = typeof item.size === "number" ? item.size : null;
        const sha = stringValue(item.sha);
        return path && sha && type === "blob" ? { path, size, sha } : null;
      })
      .filter(
        (entry): entry is { path: string; size: number | null; sha: string } =>
          entry !== null,
      )
      .filter((entry) => isSafeGithubPath(entry.path))
      .filter((entry) => pathDepth(entry.path) <= MAX_GITHUB_DEPTH)
      .filter((entry) => !isIgnoredPath(entry.path))
      .filter((entry) => isSupportedTextPath(entry.path));

    if (supportedEntries.length > MAX_GITHUB_FILES) {
      throw new GithubError(
        413,
        "GITHUB_SNAPSHOT_TOO_LARGE",
        `This repository has more than ${MAX_GITHUB_FILES} approved source files.`,
        "Choose a smaller repository or remove generated/vendor content before importing.",
      );
    }

    const warnings: string[] = [];
    const skippedCount = treeEntries.length - supportedEntries.length;
    if (skippedCount > 0) {
      warnings.push(
        `${skippedCount} generated, unsupported, or out-of-depth repository file${skippedCount === 1 ? "" : "s"} was skipped.`,
      );
    }

    const files: Array<{ path: string; content: string }> = [];
    let totalBytes = 0;
    for (const entry of supportedEntries) {
      if (entry.size !== null && entry.size > MAX_GITHUB_FILE_BYTES) {
        throw new GithubError(
          413,
          "GITHUB_SNAPSHOT_TOO_LARGE",
          `The repository file ${entry.path} exceeds the importer file-size limit.`,
          "Choose a smaller repository snapshot or remove the oversized file.",
        );
      }
      const blob = objectValue(
        await githubRequest(
          `${repoPath}/git/blobs/${encodeURIComponent(
            entry.sha,
          )}`,
          MAX_GITHUB_BLOB_RESPONSE_BYTES,
        ),
      );
      if (stringValue(blob.encoding) !== "base64" || typeof blob.content !== "string") {
        throw new GithubError(
          503,
          "GITHUB_INVALID_RESPONSE",
          `GitHub returned an unreadable source file for ${entry.path}.`,
          "Retry the import later.",
        );
      }
      const content = Buffer.from(blob.content.replace(/\s/g, ""), "base64").toString("utf8");
      const bytes = new TextEncoder().encode(content).byteLength;
      if (bytes > MAX_GITHUB_FILE_BYTES) {
        throw new GithubError(
          413,
          "GITHUB_SNAPSHOT_TOO_LARGE",
          `The repository file ${entry.path} exceeds the importer file-size limit.`,
          "Choose a smaller repository snapshot or remove the oversized file.",
        );
      }
      totalBytes += bytes;
      if (totalBytes > MAX_GITHUB_TOTAL_BYTES) {
        throw new GithubError(
          413,
          "GITHUB_SNAPSHOT_TOO_LARGE",
          "The approved repository source exceeds the total importer size limit.",
          "Choose a smaller repository or remove generated/vendor content before importing.",
        );
      }
      files.push({ path: entry.path, content });
    }

    const candidates = entrypointCandidates(files.map((file) => file.path));
    if (!candidates.length) {
      throw new GithubError(
        404,
        "GITHUB_NO_HTML_ENTRYPOINT",
        "The selected public snapshot does not contain an approved HTML entrypoint.",
        "Choose a repository snapshot that includes an .html or .htm file.",
      );
    }
    const selectedEntrypoint = parsed.data.entrypoint ?? (candidates.length === 1 ? candidates[0] : null);
    if (!selectedEntrypoint) {
      res.status(409).json({
        error: "This snapshot has more than one safe HTML entrypoint.",
        code: "GITHUB_AMBIGUOUS_ENTRYPOINT",
        entrypointCandidates: candidates,
      });
      return;
    }
    if (!candidates.includes(selectedEntrypoint)) {
      throw new GithubError(
        400,
        "GITHUB_ENTRYPOINT_INVALID",
        "Choose one of the HTML entrypoints returned for this snapshot.",
        "Select an entrypoint from the list and retry.",
      );
    }

    const bundle: SourceBundle = {
      version: 1,
      sourceType: "github_repository",
      files,
      entrypoint: selectedEntrypoint,
      metadata: {
        displayName: repository.displayName,
        sourceUrl: repository.sourceUrl,
        resolvedRef: parsed.data.ref,
        resolvedCommitSha,
        entrypointCandidates: candidates,
        warnings,
      },
    };
    res.json(
      ImportGithubRepositoryResponse.parse({
        bundle,
        analysis: analyzeBundle(bundle),
        repository,
        resolvedRef: parsed.data.ref,
        resolvedCommitSha,
        entrypointCandidates: candidates,
        warnings,
      }),
    );
  } catch (error) {
    const result = errorResponse(error);
    res.status(result.status).json(result.body);
  }
});

export default router;