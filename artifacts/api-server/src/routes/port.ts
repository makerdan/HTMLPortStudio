import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { ReplitConnectors, type Connection } from "@replit/connectors-sdk";
import {
  db,
  handoffJobsTable,
  handoffStepsTable,
  type HandoffJobRow,
  type HandoffStepRow,
} from "@workspace/db";
import { and, asc, eq, lt, or } from "drizzle-orm";
import { requireTrustedCookieOrigin } from "../middlewares/csrfMiddleware";
import {
  AnalyzeHtmlBody,
  AnalyzeHtmlResponse,
  ChatWithPoeBody,
  ChatWithPoeResponse,
  CreateReplitProjectBody,
  CreateReplitProjectResponse,
  GetReplitProjectConnectionResponse,
  GetReplitProjectConnectionSetupResponse,
  GetReplitProjectStatusParams,
  GetReplitProjectStatusResponse,
  ListPoeModelsResponse,
  RetryReplitProjectSetupParams,
  RetryReplitProjectSetupResponse,
} from "@workspace/api-zod";

type Finding = {
  severity: "info" | "warning" | "blocker";
  title: string;
  detail: string;
  action: string;
};

type SourceBundle = {
  version: 1;
  sourceType: "pasted_html" | "single_file" | "zip_project" | "github_repository" | "hosted_page" | "playground";
  files: Array<{ path: string; content: string }>;
  entrypoint: string;
  metadata: { displayName: string; sourceUrl?: string; warnings?: string[] };
};
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i);
  return match?.[1]?.trim() || "Untitled HTML app";
}

function countMatches(html: string, pattern: RegExp): number {
  return [...html.matchAll(pattern)].length;
}

function analyzeBundle(bundle: SourceBundle) {
  const entrypoint = bundle.files.find((file) => file.path === bundle.entrypoint);
  if (!entrypoint) throw new Error("BUNDLE_ENTRYPOINT_MISSING");
  const html = entrypoint.content;
  const allSource = bundle.files.map((file) => file.content).join("\n");
  const scriptTags = countMatches(html, /<script\b[^>]*>/gi);
  const externalScripts = countMatches(html, /<script\b[^>]*\bsrc\s*=/gi);
  const externalAssets = countMatches(
    html,
    /<(?:img|link|video|audio|source|iframe)\b[^>]*(?:src|href)\s*=\s*["']https?:\/\//gi,
  );
  const hasPoe = /api\.poe\.com|poe\.com\/v1|Poe[-_\s]?API/i.test(allSource);
  const hasAiClient = /api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|chat\/completions|google\.generativeai|new\s+OpenAI\b/i.test(
    allSource,
  );
  const hasBrowserKey = /(?:api[_-]?key|authorization)\s*[:=]\s*["'](?:sk-|pk-|poe-|Bearer\s)/i.test(
    allSource,
  );
  const hasFetch = /\bfetch\s*\(|XMLHttpRequest|axios\./i.test(html);
  const findings: Finding[] = [];

  for (const warning of bundle.metadata.warnings ?? []) {
    findings.push({
      severity: "warning",
      title: "Source importer warning",
      detail: warning,
      action: "Review this importer warning before handing the bundle off to Replit.",
    });
  }

  if (!/<!doctype\s+html/i.test(html)) {
    findings.push({
      severity: "warning",
      title: "No HTML doctype found",
      detail: `Entrypoint ${bundle.entrypoint} does not declare <!doctype html>, which can trigger legacy browser rendering.`,
      action: "Add <!doctype html> as the first line before porting.",
    });
  }

  if (externalScripts > 0) {
    findings.push({
      severity: "warning",
      title: "External scripts need a quick check",
      detail: `${externalScripts} script tag${externalScripts === 1 ? "" : "s"} loads from outside the file. It may depend on an allowlist, a CDN, or a service that blocks Replit previews.`,
      action: "Open the preview, then replace unavailable CDNs with a stable dependency or hosted asset.",
    });
  }

  if (externalAssets > 0) {
    findings.push({
      severity: "info",
      title: "Remote assets are present",
      detail: `${externalAssets} image, media, stylesheet, or embedded frame points to an external URL.`,
      action: "Keep working URLs as-is; copy only assets that need to be owned or authenticated.",
    });
  }

  if (hasBrowserKey) {
    findings.push({
      severity: "blocker",
      title: "Possible browser-side API key",
      detail: "The HTML appears to include an API credential pattern. Browser code cannot safely hold service keys.",
      action: "Remove the key from the HTML, put it in Replit Secrets, and call the server bridge instead.",
    });
  }

  if (hasAiClient || hasPoe) {
    findings.push({
      severity: "warning",
      title: hasPoe ? "Poe API usage detected" : "AI API usage detected",
      detail: hasPoe
        ? "This file already references Poe. It still needs to call Poe from the server to avoid browser CORS and key exposure."
        : "This file contains patterns that look like a direct AI provider call.",
      action: "Route the call through /api/port/poe/chat and configure POE_API_KEY in Replit Secrets.",
    });
  } else if (hasFetch) {
    findings.push({
      severity: "info",
      title: "Browser network calls detected",
      detail: "The HTML makes browser-side requests. They may need CORS, a server proxy, or a Replit integration.",
      action: "Test each request in Preview; move protected or blocked calls behind /api.",
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: "info",
       title: "No obvious blockers detected",
       detail: `The ${bundle.sourceType.replaceAll("_", " ")} bundle has no obvious portability blockers.`,
      action: "Preview it, test its main interaction, then keep the HTML as the portable source.",
    });
  }

  const steps = [
    "Import the HTML file or paste the document.",
    "Use the sandbox preview to test the main user journey.",
    ...(hasAiClient || hasPoe
      ? [
          "Add POE_API_KEY in Replit Secrets.",
          "Replace browser-side AI requests with the server-only Poe bridge.",
          "Use a PascalCase Poe model ID such as Claude-Sonnet-4.6.",
        ]
      : ["If a browser request fails, move that request to a server route."]),
    "Re-run this check after each compatibility change.",
  ];

  return {
    title: bundle.metadata.displayName || extractTitle(html),
    bytes: new TextEncoder().encode(html).length,
    sourceType: bundle.sourceType,
    entrypoint: bundle.entrypoint,
    fileCount: bundle.files.length,
    totalBytes: bundle.files.reduce((sum, file) => sum + new TextEncoder().encode(file.content).length, 0),
    files: bundle.files.map((file) => file.path),
    scriptCount: scriptTags,
    externalScriptCount: externalScripts,
    inlineScriptCount: Math.max(0, scriptTags - externalScripts),
    externalAssetCount: externalAssets,
    aiSignalCount: Number(hasPoe) + Number(hasAiClient) + Number(hasBrowserKey),
    findings,
    steps,
  };
}
async function poeRequest(path: string, init?: RequestInit): Promise<Response> {
  const apiKey = process.env.POE_API_KEY;
  if (!apiKey) {
    throw new Error("POE_NOT_CONFIGURED");
  }

  return fetch(`https://api.poe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

const SETUP_STEPS = [
  { name: "Poe Setup", slug: "poe-setup" },
  { name: "Port Authority", slug: "port-authority" },
  { name: "Failure Gate", slug: "failure-gate" },
  { name: "Harden Bug Fixes", slug: "harden-bug-fixes" },
  { name: "Skill Install Confirmation", slug: "skill-install-confirmation" },
] as const;

type SetupStepName = (typeof SETUP_STEPS)[number]["name"];
type SetupStepStatus = "pending" | "running" | "completed" | "failed";

type ProjectCreationResult = {
  projectId: string;
  projectUrl: string | null;
};

type ProjectCreationConnection = {
  createProject(input: {
    name: string;
    bundle: SourceBundle;
    idempotencyKey: string;
  }): Promise<ProjectCreationResult>;
  installSkill(input: {
    projectId: string;
    name: SetupStepName;
    slug: string;
    idempotencyKey: string;
  }): Promise<void>;
};

const PROJECT_CREATION_CONNECTOR = "replit-project-creation";

type HandoffJob = {
  id: string;
  sourceHtml: string;
  sourceBundle: SourceBundle;
  projectName: string;
  status: "queued" | "running" | "completed" | "failed";
  projectId: string | null;
  projectUrl: string | null;
  currentStep: SetupStepName | null;
  steps: Array<{
    name: SetupStepName;
    status: SetupStepStatus;
    error: string | null;
  }>;
  error: string | null;
  leaseToken: string | null;
};

function isUsableProjectConnection(connection: Connection): boolean {
  return (
    connection.connector_name === PROJECT_CREATION_CONNECTOR &&
    !["disconnected", "invalid", "revoked"].includes(connection.status?.toLowerCase() ?? "")
  );
}

async function hasProjectCreationConnection(): Promise<boolean> {
  try {
    const connections = await new ReplitConnectors().listConnections({
      connector_names: PROJECT_CREATION_CONNECTOR,
      refresh_policy: "auto",
    });
    return connections.some(isUsableProjectConnection);
  } catch {
    return false;
  }
}

function projectConnectionSetupUrl(): string {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME ?? "connectors.replit.com";
  const baseUrl = hostname.startsWith("http://") || hostname.startsWith("https://")
    ? hostname
    : `https://${hostname}`;
  const setupUrl = new URL("/console/connector-config", baseUrl);
  setupUrl.searchParams.set("connector", PROJECT_CREATION_CONNECTOR);
  return setupUrl.toString();
}

async function projectConnectionRequest(
  path: string,
  init: RequestInit,
  idempotencyKey?: string,
): Promise<{ status: number; body: unknown }> {
  let response: Response;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    response = await Promise.race([
      new ReplitConnectors().proxy(PROJECT_CREATION_CONNECTOR, path, {
        method: init.method,
        body: init.body,
        headers: {
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
      }),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("PROJECT_CREATION_CONNECTION_TIMEOUT")),
          25_000,
        );
      }),
    ]);
  } catch (error) {
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error("PROJECT_CREATION_CONNECTION_FAILED");
  }

  if (response.status === 204) return { status: response.status, body: null };
  try {
    return { status: response.status, body: await response.json() };
  } catch {
    throw new Error("PROJECT_CREATION_CONNECTION_INVALID_RESPONSE");
  }
}

function getStringField(value: unknown, keys: string[]): string | null {
  if (typeof value !== "object" || value === null) return null;
  for (const key of keys) {
    const field = (value as Record<string, unknown>)[key];
    if (typeof field === "string" && field.trim()) return field;
  }
  return null;
}

function skillWasConfirmed(body: unknown): boolean {
  const status = getStringField(body, ["status", "state"]);
  return (
    (typeof body === "object" &&
      body !== null &&
      (body as Record<string, unknown>).completed === true) ||
    status === "completed" ||
    status === "succeeded"
  );
}

function skillFailed(body: unknown): boolean {
  const status = getStringField(body, ["status", "state"]);
  return status === "failed" || status === "cancelled";
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function awaitSkillConfirmation(
  initialBody: unknown,
  idempotencyKey: string,
): Promise<void> {
  let body = initialBody;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (skillWasConfirmed(body)) return;
    if (skillFailed(body)) throw new Error("PROJECT_CREATION_CONNECTION_FAILED");

    const operationId = getStringField(body, ["operationId", "setupOperationId"]);
    if (!operationId) throw new Error("SKILL_INSTALLATION_NOT_CONFIRMED");

    await sleep(500);
    const operation = await projectConnectionRequest(
      `/operations/${encodeURIComponent(operationId)}`,
      { method: "GET" },
      idempotencyKey,
    );
    body = operation.body;
  }

  throw new Error("SKILL_INSTALLATION_NOT_CONFIRMED");
}

function createProjectConnection(): ProjectCreationConnection {
  return {
    async createProject({ name, bundle, idempotencyKey }) {
      const response = await projectConnectionRequest("/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          files: bundle.files,
          run: {
            entrypoint: bundle.entrypoint,
            command: "python3 -m http.server ${PORT:-3000} --directory .",
          },
          features: {
            codeEditor: false,
            versionControl: false,
          },
        }),
      }, idempotencyKey);
      const body = response.body;
      const projectId = getStringField(body, ["projectId", "id"]);
      if (!projectId) throw new Error("PROJECT_CREATION_CONNECTION_INVALID_RESPONSE");
      return {
        projectId,
        projectUrl: getStringField(body, ["projectUrl", "url"]),
      };
    },
    async installSkill({ projectId, name, slug, idempotencyKey }) {
      const response = await projectConnectionRequest(
        `/projects/${encodeURIComponent(projectId)}/setup`,
        {
          method: "POST",
          body: JSON.stringify({ name, slug }),
        },
        idempotencyKey,
      );
      await awaitSkillConfirmation(response.body, idempotencyKey);
    },
  };
}

function safeProjectName(bundle: SourceBundle): string {
  const title = (bundle.metadata.displayName || extractTitle(
    bundle.files.find((file) => file.path === bundle.entrypoint)?.content ?? "",
  ))
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);
  return `Poe Port - ${title || "HTML App"}`;
}

function containsPrivilegedCredential(bundle: SourceBundle): boolean {
  const html = bundle.files.map((file) => file.content).join("\n");
  const configuredSecrets = [process.env.POE_API_KEY].filter(
    (secret): secret is string => Boolean(secret && secret.length > 4),
  );
  if (configuredSecrets.some((secret) => html.includes(secret))) return true;

  // Keep provider formats here deliberately explicit and bounded. This is the
  // server-side safety net for imported source and chat content, so additions
  // should be accompanied by a representative case in port.test.ts.
  return [
    /(?:api[_-]?key|authorization|access[_-]?token|secret|token|api[_-]?token|password|aws[_-]?secret[_-]?access[_-]?key|client[_-]?secret|private[_-]?key)\s*[:=]\s*(?:["'`])?[^"'`\s,};]{8,}(?:["'`])?/i,
    /\b(?:sk|pk|poe|pplx|sk-ant-api\d*)-[a-z0-9_-]{8,}\b/i,
    /\bAIza[a-z0-9_-]{12,}\b/i,
    /\b(?:r8|hf)_[a-z0-9_-]{8,}\b/i,
    /\b(?:gsk|npm|dop_v1|lin_api|sq0atp)[_-][a-z0-9_-]{8,}\b/i,
    /\bSG\.[a-z0-9_-]{16,}\b/i,
    /\b(?:ghp|gho|ghu|ghs|ghr)_[a-z0-9_-]{20,}\b/i,
    /\bgithub_pat_[a-z0-9_]{20,}\b/i,
    /\bxox[bpras]-[a-z0-9-]{10,}\b/i,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\beyJ[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\b/i,
    /\bBearer\s+[a-z0-9._-]{8,}\b/i,
  ].some((pattern) => pattern.test(html));
}

function toHandoffJob(job: HandoffJobRow, steps: HandoffStepRow[]): HandoffJob {
  return {
    id: job.id,
    sourceHtml: job.sourceHtml,
    sourceBundle: (job.sourceBundle ?? normalizeBundle({ html: job.sourceHtml })) as SourceBundle,
    projectName: job.projectName,
    status: job.status as HandoffJob["status"],
    projectId: job.projectId,
    projectUrl: job.projectUrl,
    currentStep: job.currentStep as SetupStepName | null,
    steps: steps.map((step) => ({
      name: step.name as SetupStepName,
      status: step.status as SetupStepStatus,
      error: step.error,
    })),
    error: job.error,
    leaseToken: job.leaseToken,
  };
}

async function loadJob(jobId: string, ownerId?: string): Promise<HandoffJob | null> {
  const where = ownerId
    ? and(eq(handoffJobsTable.id, jobId), eq(handoffJobsTable.ownerId, ownerId))
    : eq(handoffJobsTable.id, jobId);
  const [job] = await db.select().from(handoffJobsTable).where(where);
  if (!job) return null;
  const steps = await db
    .select()
    .from(handoffStepsTable)
    .where(eq(handoffStepsTable.jobId, jobId))
    .orderBy(asc(handoffStepsTable.position));
  return toHandoffJob(job, steps);
}

function publicJob(job: HandoffJob) {
  return {
    jobId: job.id,
    status: job.status,
    projectId: job.projectId,
    projectUrl: job.projectUrl,
    projectName: job.projectName,
    currentStep: job.currentStep,
    steps: job.steps,
    error: job.error,
  };
}

function jobError(message: unknown): string {
  if (message instanceof Error) {
    if (message.message === "PROJECT_CREATION_CONNECTION_FAILED") {
      return "The Replit project connection rejected the request. Check its authorization and try again.";
    }
    if (message.message === "PROJECT_CREATION_CONNECTION_INVALID_RESPONSE") {
      return "The Replit project connection returned an invalid response. Try again or reconnect it.";
    }
    if (message.message === "PROJECT_CREATION_CONNECTION_TIMEOUT") {
      return "The Replit project connection timed out. The operation can be retried safely.";
    }
    if (message.message === "SKILL_INSTALLATION_NOT_CONFIRMED") {
      return "The setup skill did not confirm completion, so later steps were not started. Retry this step after checking the Replit connection.";
    }
  }
  return "The Replit project setup could not be completed. Retry the failed step.";
}

const JOB_LEASE_MS = 2 * 60 * 1000;
const JOB_HEARTBEAT_MS = 20_000;

class LeaseLostError extends Error {
  constructor() {
    super("HANDOFF_JOB_LEASE_LOST");
  }
}

async function persistJob(job: HandoffJob): Promise<void> {
  const where = and(
    eq(handoffJobsTable.id, job.id),
    eq(handoffJobsTable.status, "running"),
    eq(handoffJobsTable.leaseToken, job.leaseToken!),
  );
  const [updated] = await db
    .update(handoffJobsTable)
    .set({
      status: job.status,
      projectId: job.projectId,
      projectUrl: job.projectUrl,
      currentStep: job.currentStep,
      error: job.error,
      leaseExpiresAt:
        job.status === "running" ? new Date(Date.now() + JOB_LEASE_MS) : null,
      updatedAt: new Date(),
    })
    .where(where)
    .returning({ id: handoffJobsTable.id });
  if (!updated) throw new LeaseLostError();
  await Promise.all(
    job.steps.map((step, position) =>
      db
        .update(handoffStepsTable)
        .set({ status: step.status, error: step.error, updatedAt: new Date() })
        .where(
          and(
            eq(handoffStepsTable.jobId, job.id),
            eq(handoffStepsTable.position, position),
          ),
        ),
    ),
  );
}

async function runHandoffJob(jobId: string): Promise<void> {
  const leaseToken = randomUUID();
  const [claimed] = await db
    .update(handoffJobsTable)
    .set({
      status: "running",
      leaseExpiresAt: new Date(Date.now() + JOB_LEASE_MS),
      leaseToken,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(handoffJobsTable.id, jobId),
        or(
          eq(handoffJobsTable.status, "queued"),
          and(
            eq(handoffJobsTable.status, "running"),
            lt(handoffJobsTable.leaseExpiresAt, new Date()),
          ),
        ),
      ),
    )
    .returning({ id: handoffJobsTable.id, leaseToken: handoffJobsTable.leaseToken });
  if (!claimed) return;
  const job = await loadJob(jobId);
  if (!job) return;
  job.status = "running";
  job.leaseToken = claimed.leaseToken;
  const connection = createProjectConnection();
  let leaseLost = false;
  const heartbeat = setInterval(() => {
    void db
      .update(handoffJobsTable)
      .set({ leaseExpiresAt: new Date(Date.now() + JOB_LEASE_MS), updatedAt: new Date() })
      .where(
        and(
          eq(handoffJobsTable.id, job.id),
          eq(handoffJobsTable.status, "running"),
          eq(handoffJobsTable.leaseToken, job.leaseToken!),
        ),
      )
      .returning({ id: handoffJobsTable.id })
      .then(([updated]) => {
        if (!updated) leaseLost = true;
      })
      .catch(() => {
        leaseLost = true;
      });
  }, JOB_HEARTBEAT_MS);
  heartbeat.unref();
  const assertLease = () => {
    if (leaseLost) throw new LeaseLostError();
  };

  try {
    if (!job.projectId) {
      assertLease();
      const project = await connection.createProject({
        name: job.projectName,
        bundle: job.sourceBundle,
        idempotencyKey: `handoff:${job.id}:project`,
      });
      assertLease();
      job.projectId = project.projectId;
      job.projectUrl = project.projectUrl;
      await persistJob(job);
    }

    const firstIncomplete = job.steps.findIndex(
      (step) => step.status !== "completed",
    );
    for (let index = Math.max(firstIncomplete, 0); index < job.steps.length; index += 1) {
      const step = job.steps[index];
      step.status = "running";
      step.error = null;
      job.currentStep = step.name;
      job.error = null;
      await persistJob(job);
      assertLease();

      try {
        const definition = SETUP_STEPS[index];
        if (!job.projectId) {
          throw new Error("PROJECT_CREATION_CONNECTION_INVALID_RESPONSE");
        }
        await connection.installSkill({
          projectId: job.projectId,
          name: definition.name,
          slug: definition.slug,
          idempotencyKey: `handoff:${job.id}:step:${index}`,
        });
        assertLease();
        step.status = "completed";
        await persistJob(job);
      } catch (error) {
        step.status = "failed";
        step.error = jobError(error);
        job.error = step.error;
        job.status = "failed";
        await persistJob(job);
        return;
      }
    }

    job.currentStep = null;
    job.status = "completed";
    job.error = null;
    await persistJob(job);
  } catch (error) {
    if (error instanceof LeaseLostError) return;
    job.status = "failed";
    job.error = jobError(error);
    await persistJob(job);
  } finally {
    clearInterval(heartbeat);
  }
}

async function resumeDurableJobs(): Promise<void> {
  const jobs = await db
    .select({ id: handoffJobsTable.id })
    .from(handoffJobsTable)
    .where(
      or(
        eq(handoffJobsTable.status, "queued"),
        and(
          eq(handoffJobsTable.status, "running"),
          lt(handoffJobsTable.leaseExpiresAt, new Date()),
        ),
      ),
    );
  for (const job of jobs) void runHandoffJob(job.id);
}

const resumeTimer = setInterval(() => {
  void resumeDurableJobs().catch(() => undefined);
}, 15_000);
resumeTimer.unref();
setTimeout(() => void resumeDurableJobs().catch(() => undefined), 0).unref();

const router: IRouter = Router();

router.post("/port/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeHtmlBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid HTML analysis request");
    res.status(400).json({
      error: "Provide exactly one non-empty HTML document or source bundle.",
      code: "INVALID_SOURCE_BUNDLE",
    });
    return;
  }

  try {
    const bundle = normalizeBundle(
      parsed.data as { html?: string; bundle?: SourceBundle },
    );
    res.json(AnalyzeHtmlResponse.parse(analyzeBundle(bundle)));
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "INVALID_SOURCE_BUNDLE";
    const tooLarge =
      code === "BUNDLE_TOO_LARGE" || code === "BUNDLE_FILE_TOO_LARGE";
    res.status(tooLarge ? 413 : 400).json({
      error: "Provide exactly one valid source bundle no larger than 2 MB.",
      code,
    });
  }
});

router.get("/port/poe/models", async (req, res): Promise<void> => {
  if (!process.env.POE_API_KEY) {
    res.json(
      ListPoeModelsResponse.parse({
        configured: false,
        models: [],
        message: "Add POE_API_KEY in Replit Secrets to enable Poe.",
      }),
    );
    return;
  }

  try {
    const response = await poeRequest("/models");
    if (!response.ok) {
      req.log.warn({ status: response.status }, "Poe model lookup failed");
      res.json(
        ListPoeModelsResponse.parse({
          configured: true,
          models: [],
          message: `Poe is configured, but the model list returned ${response.status}. Check the key and Poe account access.`,
        }),
      );
      return;
    }

    const body: unknown = await response.json();
    const models =
      typeof body === "object" &&
      body !== null &&
      "data" in body &&
      Array.isArray((body as { data?: unknown }).data)
        ? (body as { data: Array<{ id?: unknown }> }).data
            .map((model) => (typeof model.id === "string" ? model.id : null))
            .filter((model): model is string => model !== null)
        : [];

    res.json(
      ListPoeModelsResponse.parse({
        configured: true,
        models,
        message: models.length
          ? "Live models loaded from Poe."
          : "Poe is configured, but returned no models.",
      }),
    );
  } catch (error) {
    req.log.error({ error }, "Poe model lookup crashed");
    res.json(
      ListPoeModelsResponse.parse({
        configured: true,
        models: [],
        message: "Poe could not be reached. Your key was not changed.",
      }),
    );
  }
});

router.post("/port/poe/chat", async (req, res): Promise<void> => {
  const parsed = ChatWithPoeBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid Poe chat request");
    res.status(400).json({ error: "Provide a model and at least one message." });
    return;
  }

  if (parsed.data.messages.some((message) => containsPrivilegedCredential({
    version: 1,
    sourceType: "pasted_html",
    files: [{ path: "chat.txt", content: message.content }],
    entrypoint: "chat.txt",
    metadata: { displayName: "Poe chat" },
  }))) {
    res.status(400).json({
      error:
        "This chat request contains a service credential. Remove it before sending content to Poe; the request was not forwarded.",
      code: "CHAT_CONTAINS_CREDENTIAL",
    });
    return;
  }

  try {
    const response = await poeRequest("/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model: parsed.data.model,
        messages: parsed.data.messages,
        max_tokens: parsed.data.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      req.log.warn({ status: response.status }, "Poe chat request failed");
      res.status(503).json({
        error: `Poe returned ${response.status}. Check POE_API_KEY, account access, and the exact PascalCase model ID.`,
      });
      return;
    }

    const body: unknown = await response.json();
    const completion = body as {
      model?: unknown;
      choices?: Array<{ message?: { content?: unknown } }>;
      usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
    };
    const content = completion.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      req.log.warn("Poe chat response had no text content");
      res.status(503).json({ error: "Poe returned a completion without text content." });
      return;
    }

    res.json(
      ChatWithPoeResponse.parse({
        content,
        model:
          typeof completion.model === "string"
            ? completion.model
            : parsed.data.model,
        usage: completion.usage
          ? {
              promptTokens:
                typeof completion.usage.prompt_tokens === "number"
                  ? completion.usage.prompt_tokens
                  : 0,
              completionTokens:
                typeof completion.usage.completion_tokens === "number"
                  ? completion.usage.completion_tokens
                  : 0,
            }
          : undefined,
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.message === "POE_NOT_CONFIGURED") {
      res.status(503).json({
        error: "Poe is not configured. Add POE_API_KEY in Replit Secrets, then restart the API server.",
      });
      return;
    }

    req.log.error({ error }, "Poe chat request crashed");
    res.status(503).json({
      error: "Poe could not be reached. Check your connection and try again.",
    });
  }
});

router.get("/port/replit-project-connection", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({
      error: "Log in to check Replit project creation.",
      code: "AUTHENTICATION_REQUIRED",
    });
    return;
  }

  const connected = await hasProjectCreationConnection();
  res.json(
    GetReplitProjectConnectionResponse.parse({
      status: connected ? "connected" : "setup_required",
    }),
  );
});

router.get("/port/replit-project-connection/setup", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({
      error: "Log in before configuring Replit project creation.",
      code: "AUTHENTICATION_REQUIRED",
    });
    return;
  }
  const connected = await hasProjectCreationConnection();
  res.json(
    GetReplitProjectConnectionSetupResponse.parse({
      status: connected ? "connected" : "setup_required",
      setupUrl: connected ? null : projectConnectionSetupUrl(),
    }),
  );
});

router.post("/port/replit-projects", requireTrustedCookieOrigin, async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({
      error: "Log in before creating a project.",
      code: "AUTHENTICATION_REQUIRED",
    });
    return;
  }
  const parsed = CreateReplitProjectBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid Replit project handoff request");
    const tooLarge = parsed.error.issues.some((issue) => issue.code === "too_big");
    res.status(tooLarge ? 413 : 400).json({
      error: "Provide exactly one valid source bundle no larger than 2 MB.",
      code: tooLarge
        ? "PROJECT_HANDOFF_SOURCE_TOO_LARGE"
        : "INVALID_PROJECT_HANDOFF",
    });
    return;
  }

  let bundle: SourceBundle;
  try {
    bundle = normalizeBundle(
      parsed.data as { html?: string; bundle?: SourceBundle },
    );
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "INVALID_SOURCE_BUNDLE";
    const tooLarge =
      code === "BUNDLE_TOO_LARGE" || code === "BUNDLE_FILE_TOO_LARGE";
    res.status(tooLarge ? 413 : 400).json({
      error: "Provide exactly one valid source bundle no larger than 2 MB.",
      code: tooLarge ? "PROJECT_HANDOFF_SOURCE_TOO_LARGE" : code,
    });
    return;
  }

  if (containsPrivilegedCredential(bundle)) {
    res.status(400).json({
      error:
        "This source bundle appears to contain a service credential. Remove it before creating a project; the source was not sent to Replit.",
      code: "SOURCE_CONTAINS_CREDENTIAL",
    });
    return;
  }

  if (!(await hasProjectCreationConnection())) {
    res.status(503).json({
      error:
        "Replit project creation is unavailable. Connect the authorized Replit project-creation capability, then try again.",
      code: "PROJECT_CREATION_CONNECTION_UNAVAILABLE",
      action:
        "A workspace owner can connect it from the HTML Studio setup screen. Never paste a credential into the Studio.",
    });
    return;
  }

  const entrypointHtml =
    bundle.files.find((file) => file.path === bundle.entrypoint)?.content ?? "";
  const job: HandoffJob = {
    id: randomUUID(),
    sourceHtml: entrypointHtml,
    sourceBundle: bundle,
    projectName: safeProjectName(bundle),
    status: "queued",
    projectId: null,
    projectUrl: null,
    currentStep: null,
    steps: SETUP_STEPS.map(({ name }) => ({
      name,
      status: "pending",
      error: null,
    })),
    error: null,
    leaseToken: null,
  };
  await db.transaction(async (tx) => {
    await tx.insert(handoffJobsTable).values({
      id: job.id,
      ownerId: req.user.id,
      sourceHtml: job.sourceHtml,
      sourceBundle: job.sourceBundle,
      projectName: job.projectName,
      status: job.status,
    });
    await tx.insert(handoffStepsTable).values(
      SETUP_STEPS.map((step, position) => ({
        id: randomUUID(),
        jobId: job.id,
        position,
        name: step.name,
        slug: step.slug,
        status: "pending",
      })),
    );
  });
  res.status(202).json(CreateReplitProjectResponse.parse(publicJob(job)));
  void runHandoffJob(job.id);
});

router.get("/port/replit-projects/:jobId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({
      error: "Log in to view this project handoff.",
      code: "AUTHENTICATION_REQUIRED",
    });
    return;
  }
  const parsed = GetReplitProjectStatusParams.safeParse(req.params);
  const job = parsed.success
    ? await loadJob(parsed.data.jobId, req.user.id)
    : null;
  if (!job) {
    res.status(404).json({
      error: "That Replit project creation job was not found or has expired.",
      code: "PROJECT_HANDOFF_NOT_FOUND",
    });
    return;
  }
  res.json(GetReplitProjectStatusResponse.parse(publicJob(job)));
});

router.post(
  "/port/replit-projects/:jobId/retry",
  requireTrustedCookieOrigin,
  async (req, res): Promise<void> => {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        error: "Log in to retry this project handoff.",
        code: "AUTHENTICATION_REQUIRED",
      });
      return;
    }
    const parsed = RetryReplitProjectSetupParams.safeParse(req.params);

    if (!parsed.success) {
      res.status(404).json({
        error: "That Replit project creation job was not found or has expired.",
        code: "PROJECT_HANDOFF_NOT_FOUND",
      });
      return;
    }

    if (!(await hasProjectCreationConnection())) {
      res.status(503).json({
        error:
          "The authorized Replit project-creation connection is unavailable. Reconnect it from the HTML Studio setup screen before retrying.",
        code: "PROJECT_CREATION_CONNECTION_UNAVAILABLE",
      });
      return;
    }

    const wonRetry = await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(handoffJobsTable)
        .set({
          status: "queued",
          currentStep: null,
          error: null,
          leaseExpiresAt: null,
          leaseToken: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(handoffJobsTable.id, parsed.data.jobId),
            eq(handoffJobsTable.ownerId, req.user.id),
            eq(handoffJobsTable.status, "failed"),
          ),
        )
        .returning({ id: handoffJobsTable.id });
      if (!claimed) return false;

      await tx
        .update(handoffStepsTable)
        .set({ status: "pending", error: null, updatedAt: new Date() })
        .where(
          and(
            eq(handoffStepsTable.jobId, claimed.id),
            eq(handoffStepsTable.status, "failed"),
          ),
        );
      return true;
    });

    if (!wonRetry) {
      const existing = await loadJob(parsed.data.jobId, req.user.id);
      res.status(existing ? 400 : 404).json(
        existing
          ? {
              error: "Only a failed project setup can be retried.",
              code: "PROJECT_HANDOFF_NOT_RETRYABLE",
            }
          : {
              error: "That Replit project creation job was not found or has expired.",
              code: "PROJECT_HANDOFF_NOT_FOUND",
            },
      );
      return;
    }

    const job = await loadJob(parsed.data.jobId, req.user.id);
    if (!job) {
      res.status(404).json({
        error: "That Replit project creation job was not found or has expired.",
        code: "PROJECT_HANDOFF_NOT_FOUND",
      });
      return;
    }
    res.status(202).json(RetryReplitProjectSetupResponse.parse(publicJob(job)));
    void runHandoffJob(job.id);
  },
);

const MAX_BUNDLE_BYTES = 2_000_000;

const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/-]+$/;

const MAX_BUNDLE_FILES = 200;

const MAX_FILE_BYTES = 1_000_000;

function normalizeBundle(input: { html?: string; bundle?: SourceBundle }): SourceBundle {
  if (input.html !== undefined && input.bundle !== undefined) {
    throw new Error("BUNDLE_AMBIGUOUS");
  }
  if (input.bundle) {
    const bundle = input.bundle;
    const seen = new Set<string>();
    let totalBytes = 0;
    if (bundle.files.length > MAX_BUNDLE_FILES) throw new Error("BUNDLE_TOO_MANY_FILES");
    for (const file of bundle.files) {
      if (!SAFE_PATH.test(file.path) || file.path.endsWith("/") || file.path.includes("//")) {
        throw new Error("BUNDLE_UNSAFE_PATH");
      }
      if (seen.has(file.path)) throw new Error("BUNDLE_DUPLICATE_PATH");
      seen.add(file.path);
      const bytes = new TextEncoder().encode(file.content).length;
      if (bytes > MAX_FILE_BYTES) throw new Error("BUNDLE_FILE_TOO_LARGE");
      totalBytes += bytes;
    }
    if (totalBytes > MAX_BUNDLE_BYTES) throw new Error("BUNDLE_TOO_LARGE");
    if (!seen.has(bundle.entrypoint)) throw new Error("BUNDLE_ENTRYPOINT_MISSING");
    if (!bundle.files.find((file) => file.path === bundle.entrypoint)?.content.trim()) {
      throw new Error("BUNDLE_ENTRYPOINT_EMPTY");
    }
    return {
      ...bundle,
      files: bundle.files.map((file) => ({ ...file, path: file.path.replaceAll("\\", "/") })),
    };
  }
  if (typeof input.html !== "string" || !input.html.trim()) throw new Error("BUNDLE_EMPTY");
  if (new TextEncoder().encode(input.html).length > MAX_BUNDLE_BYTES) throw new Error("BUNDLE_TOO_LARGE");
  return {
    version: 1,
    sourceType: "pasted_html",
    files: [{ path: "index.html", content: input.html }],
    entrypoint: "index.html",
    metadata: { displayName: extractTitle(input.html) },
  };
}

export default router;
