const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/-]+$/;
const SAFE_REF = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/-]+$/;
const TEXT_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".svg",
  ".txt",
  ".md",
]);
const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".cache",
  "vendor",
]);
const MAX_ENTRYPOINT_CANDIDATES = 20;

export type GithubRepoCoordinates = {
  owner: string;
  repo: string;
  sourceUrl: string;
};

export class GithubError extends Error {
  readonly status: number;
  readonly code: string;
  readonly action?: string;

  constructor(status: number, code: string, message: string, action?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.action = action;
  }
}

export function parseGithubUrl(value: string): GithubRepoCoordinates {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GithubError(
      400,
      "GITHUB_URL_INVALID",
      "Enter a valid public GitHub repository URL.",
      "Use a URL such as https://github.com/owner/repository.",
    );
  }

  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "github.com" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new GithubError(
      400,
      "GITHUB_URL_UNSUPPORTED",
      "Only public repositories hosted at https://github.com are supported.",
      "Remove query parameters and use the repository URL, not a GitHub API or raw-content URL.",
    );
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2) {
    throw new GithubError(
      400,
      "GITHUB_URL_UNSUPPORTED",
      "Enter a GitHub repository URL, not a file, branch, issue, or pull-request URL.",
      "Use https://github.com/owner/repository.",
    );
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new GithubError(
      400,
      "GITHUB_URL_INVALID",
      "That GitHub repository URL contains an unsupported owner or repository name.",
      "Use the public repository URL copied from GitHub.",
    );
  }

  return {
    owner,
    repo,
    sourceUrl: `https://github.com/${owner}/${repo}`,
  };
}

export function pathDepth(path: string): number {
  return path.split("/").length - 1;
}

export function isSafeGithubPath(path: string): boolean {
  return SAFE_PATH.test(path) && !path.endsWith("/") && !path.includes("//");
}

export function isSafeGithubRef(ref: string): boolean {
  return ref.length > 0 && ref.length <= 256 && SAFE_REF.test(ref);
}

export function isSupportedTextPath(path: string): boolean {
  const dot = path.lastIndexOf(".");
  return dot >= 0 && TEXT_EXTENSIONS.has(path.slice(dot).toLowerCase());
}

export function isIgnoredPath(path: string): boolean {
  return path.split("/").some((part) => IGNORED_DIRECTORIES.has(part));
}

export function entrypointCandidates(paths: string[]): string[] {
  return paths
    .filter((path) => /\.(?:html?|HTML?)$/.test(path))
    .sort((a, b) => {
      const aRootIndex = a === "index.html" ? 0 : a === "index.htm" ? 1 : 2;
      const bRootIndex = b === "index.html" ? 0 : b === "index.htm" ? 1 : 2;
      if (aRootIndex !== bRootIndex) return aRootIndex - bRootIndex;
      const depthDifference = pathDepth(a) - pathDepth(b);
      return depthDifference || a.localeCompare(b);
    })
    .slice(0, MAX_ENTRYPOINT_CANDIDATES);
}