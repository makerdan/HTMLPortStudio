import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { ReplitConnectors, type Connection } from "@replit/connectors-sdk";
import {
  db,
  handoffJobsTable,
  handoffStepsTable,
  takePoeChatRateLimit as takeSharedPoeChatRateLimit,
  type HandoffJobRow,
  type HandoffStepRow,
} from "@workspace/db";
import { and, asc, eq, lt, or } from "drizzle-orm";
import { requireTrustedCookieOrigin } from "../middlewares/csrfMiddleware";
import { requireAuth } from "../middlewares/clerkAuthMiddleware";
import { fetchHostedUrl, HostedUrlError } from "./hosted-url";
import { importPlayground, PlaygroundError } from "./playground";
import {
  AnalyzeHtmlBody,
  AnalyzeHtmlResponse,
  analyzeHtmlBodyThreeHtmlMax as SOURCE_TEXT_MAX_BYTES,
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
  type PoeMessage,
  ImportPlaygroundResponse,
} from "@workspace/api-zod";
import {
  canonicalSkillInstallRequest,
  canonicalSkillResolutionDiagnostic,
  resolvedCanonicalSkillId,
} from "../project-creation-contract";

type Finding = {
  severity: "info" | "warning" | "blocker";
  title: string;
  detail: string;
  action: string;
};

export type SourceBundle = {
  version: 1;
  sourceType: "pasted_html" | "single_file" | "zip_project" | "github_repository" | "hosted_page" | "playground";
  files: Array<{ path: string; content: string }>;
  entrypoint: string;
  metadata: {
    displayName: string;
    sourceUrl?: string;
    warnings?: string[];
    originalUrl?: string;
    finalUrl?: string;
    resolvedRef?: string;
    resolvedCommitSha?: string;
    entrypointCandidates?: string[];
  };
};
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i);
  return match?.[1]?.trim() || "Untitled HTML app";
}

function countMatches(html: string, pattern: RegExp): number {
  return [...html.matchAll(pattern)].length;
}

export function analyzeBundle(bundle: SourceBundle) {
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
  const hasBrowserKey = containsPrivilegedCredential(bundle);
  const hasFetch = /\bfetch\s*\(|XMLHttpRequest|axios\./i.test(html);
  const localAssetReferences = [
    ...html.matchAll(
      /<(?:img|link|video|audio|source|iframe|script)\b[^>]*(?:src|href)\s*=\s*["']([^"']+)["']/gi,
    ),
  ]
    .map((match) => match[1])
    .filter(
      (reference): reference is string =>
        Boolean(
          reference &&
            !reference.startsWith("#") &&
            !/^(?:data|mailto|javascript):/i.test(reference) &&
            !/^https?:\/\//i.test(reference),
        ),
    );
  const externalDependencies = [
    ...html.matchAll(
      /<(?:img|link|video|audio|source|iframe|script)\b[^>]*(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi,
    ),
  ].map((match) => match[1]);
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
      title: "Possible service credential",
      detail: "The imported source appears to include a service credential pattern. Browser code and generated projects cannot safely hold service keys.",
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
          "Use a Poe model ID exactly as returned by the live model catalogue.",
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
    localAssetReferences: [...new Set(localAssetReferences)],
    externalDependencies: [...new Set(externalDependencies)],
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

  const baseUrl = (process.env.POE_API_BASE_URL ?? "https://api.poe.com/v1").replace(/\/+$/, "");
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

type PoeModelCatalogue = {
  configured: boolean;
  models: string[];
  message: string;
  available: boolean;
  failed: boolean;
};

export const POE_CHAT_REQUEST_MAX_BYTES = 512 * 1024;
export const POE_CHAT_MAX_COMPLETION_TOKENS = 4_096;
const POE_CHAT_RATE_LIMIT_WINDOW_MS = 60_000;
const POE_CHAT_RATE_LIMIT_MAX_REQUESTS = 6;
const POE_MODEL_CATALOGUE_CACHE_TTL_MS = 30_000;
const POE_MODEL_CATALOGUE_FAILURE_CACHE_TTL_MS = 5_000;

type PoeModelCatalogueCache = {
  value: PoeModelCatalogue;
  expiresAt: number;
};

let poeModelCatalogueCache: PoeModelCatalogueCache | null = null;
let poeModelCatalogueInFlight: Promise<PoeModelCatalogue> | null = null;

function poeClientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

async function takePoeChatRateLimit(req: Request): Promise<{
  allowed: boolean;
  retryAfterSeconds?: number;
  storageUnavailable?: boolean;
}> {
  try {
    return await takeSharedPoeChatRateLimit(
      poeClientKey(req),
      POE_CHAT_RATE_LIMIT_WINDOW_MS,
      POE_CHAT_RATE_LIMIT_MAX_REQUESTS,
    );
  } catch {
    return {
      allowed: false,
      storageUnavailable: true,
    };
  }
}

async function loadPoeModelCatalogue(): Promise<PoeModelCatalogue> {
  const now = Date.now();
  if (poeModelCatalogueCache && poeModelCatalogueCache.expiresAt > now) {
    return poeModelCatalogueCache.value;
  }
  if (poeModelCatalogueInFlight) {
    return poeModelCatalogueInFlight;
  }

  poeModelCatalogueInFlight = loadPoeModelCatalogueFromPoe();
  try {
    const catalogue = await poeModelCatalogueInFlight;
    poeModelCatalogueCache = {
      value: catalogue,
      expiresAt:
        Date.now() +
        (catalogue.failed
          ? POE_MODEL_CATALOGUE_FAILURE_CACHE_TTL_MS
          : POE_MODEL_CATALOGUE_CACHE_TTL_MS),
    };
    return catalogue;
  } finally {
    poeModelCatalogueInFlight = null;
  }
}

async function loadPoeModelCatalogueFromPoe(): Promise<PoeModelCatalogue> {
  if (!process.env.POE_API_KEY) {
    return {
      configured: false,
      models: [],
      message: "Add POE_API_KEY in Replit Secrets to enable Poe.",
      available: false,
      failed: false,
    };
  }

  try {
    const response = await poeRequest("/models");
    if (!response.ok) {
      return {
        configured: true,
        models: [],
        message: "Poe model availability could not be loaded. Retry the request.",
        available: false,
        failed: true,
      };
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

    return {
      configured: true,
      models,
      message: models.length
        ? "Live models loaded from Poe."
        : "Poe is configured, but returned no models.",
      available: models.length > 0,
      failed: false,
    };
  } catch {
    return {
      configured: true,
      models: [],
      message: "Poe could not be reached. Your key was not changed.",
      available: false,
      failed: true,
    };
  }
}

export function isPoeModelConfirmed(models: readonly string[], requestedModel: string): boolean {
  return models.some((model) => model === requestedModel);
}

const SETUP_STEPS = [
  { name: "Port Authority", skillId: "port-authority" },
  { name: "Failure Gate", skillId: "failure-gate" },
  { name: "Regression Guard", skillId: "regression-guard" },
  { name: "Skill Mirror Sync", skillId: "skill-mirror-sync" },
  { name: "App Support Ops", skillId: "app-support-ops" },
  { name: "Poe Setup", skillId: "poe-setup" },
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
    skillId: string;
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
  return "https://replit.com/integrations";
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

function skillWasConfirmed(body: unknown, skillId: string): boolean {
  const status = getStringField(body, ["status", "state"]);
  return (
    (typeof body === "object" &&
      body !== null &&
      (body as Record<string, unknown>).completed === true) ||
    status === "completed" ||
    status === "succeeded"
  ) && resolvedCanonicalSkillId(body) === skillId;
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
  skillId: string,
): Promise<void> {
  let body = initialBody;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (skillWasConfirmed(body, skillId)) return;
    if (skillFailed(body)) throw new Error("PROJECT_CREATION_CONNECTION_FAILED");

    const operationId = getStringField(body, ["operationId", "setupOperationId"]);
    if (!operationId) {
      throw new Error("CANONICAL_SKILL_NOT_RESOLVED");
    }

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
    async installSkill({ projectId, skillId, idempotencyKey }) {
      const response = await projectConnectionRequest(
        `/projects/${encodeURIComponent(projectId)}/setup`,
        {
          method: "POST",
          body: JSON.stringify(canonicalSkillInstallRequest(skillId)),
        },
        idempotencyKey,
      );
      await awaitSkillConfirmation(response.body, idempotencyKey, skillId);
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
  const html = bundle.files
    .flatMap((file) => [file.path, file.content])
    .join("\n");
  const configuredSecrets = [process.env.POE_API_KEY].filter(
    (secret): secret is string => Boolean(secret && secret.length > 4),
  );
  if (configuredSecrets.some((secret) => html.includes(secret))) return true;

  // The Studio may send a complete source snapshot after replacing every
  // detected value with this literal marker. It is deliberately removed only
  // for the detector; any other credential-like value remains blocked.
  const redactedHtml = html.split("[REDACTED CREDENTIAL]").join("");

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
  ].some((pattern) => pattern.test(redactedHtml));
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
    if (message.message === "CANONICAL_SKILL_NOT_RESOLVED") {
      return canonicalSkillResolutionDiagnostic();
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
  await db.transaction(async (tx) => {
    const [updated] = await tx
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
        tx
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
  });
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
          skillId: definition.skillId,
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
const hostedImportAttempts = new Map<string, number[]>();
const HOSTED_IMPORT_WINDOW_MS = 60_000;
const HOSTED_IMPORT_LIMIT = 10;
const playgroundImportAttempts = new Map<string, number[]>();
const PLAYGROUND_IMPORT_WINDOW_MS = 60_000;
const PLAYGROUND_IMPORT_LIMIT = 10;

function hostedImportRateLimited(request: { ip?: string }): boolean {
  const key = request.ip || "unknown";
  const now = Date.now();
  const recent = (hostedImportAttempts.get(key) ?? []).filter(
    (timestamp) => now - timestamp < HOSTED_IMPORT_WINDOW_MS,
  );
  if (recent.length >= HOSTED_IMPORT_LIMIT) {
    hostedImportAttempts.set(key, recent);
    return true;
  }
  recent.push(now);
  hostedImportAttempts.set(key, recent);
  return false;
}

function playgroundImportRateLimited(request: { ip?: string }): boolean {
  const key = request.ip || "unknown";
  const now = Date.now();
  const recent = (playgroundImportAttempts.get(key) ?? []).filter(
    (timestamp) => now - timestamp < PLAYGROUND_IMPORT_WINDOW_MS,
  );
  if (recent.length >= PLAYGROUND_IMPORT_LIMIT) {
    playgroundImportAttempts.set(key, recent);
    return true;
  }
  recent.push(now);
  playgroundImportAttempts.set(key, recent);
  return false;
}

router.post("/port/analyze", async (req, res): Promise<void> => {
  const boundaryCode = getAnalysisBoundaryCode(req.body);
  if (boundaryCode) {
    const tooLarge =
      boundaryCode === "BUNDLE_TOO_LARGE" ||
      boundaryCode === "BUNDLE_FILE_TOO_LARGE";
    res.status(tooLarge ? 413 : 400).json({
      error: `Provide exactly one valid source bundle no larger than ${SOURCE_TEXT_LIMIT_LABEL}.`,
      code: boundaryCode,
    });
    return;
  }

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
      error: `Provide exactly one valid source bundle no larger than ${SOURCE_TEXT_LIMIT_LABEL}.`,
      code,
    });
  }
});

router.post("/port/hosted-url", async (req, res): Promise<void> => {
  if (hostedImportRateLimited(req)) {
    res.status(429).json({
      error: "Hosted URL imports are temporarily rate limited. Wait a minute and try again.",
      code: "HOSTED_URL_RATE_LIMITED",
      action: "Wait before retrying; use paste or file import if you already have the HTML.",
    });
    return;
  }

  const body =
    typeof req.body === "object" && req.body !== null
      ? (req.body as { url?: unknown })
      : {};
  if (typeof body.url !== "string") {
    res.status(400).json({
      error: "Provide one complete public HTTP(S) URL.",
      code: "HOSTED_URL_INVALID",
      action: "Use a URL beginning with https:// that serves an HTML document.",
    });
    return;
  }

  try {
    const result = await fetchHostedUrl(body.url);
    const bundle: SourceBundle = {
      version: 1,
      sourceType: "hosted_page",
      files: [{ path: "index.html", content: result.html }],
      entrypoint: "index.html",
      metadata: {
        displayName: extractTitle(result.html),
        sourceUrl: result.originalUrl,
        originalUrl: result.originalUrl,
        finalUrl: result.finalUrl,
        warnings: result.warnings,
      },
    };
    res.json({
      originalUrl: result.originalUrl,
      finalUrl: result.finalUrl,
      status: "fetched",
      bundle,
      warnings: result.warnings,
    });
  } catch (error) {
    const hostedError =
      error instanceof HostedUrlError
        ? error
        : new HostedUrlError(
            "HOSTED_URL_FETCH_FAILED",
            "The hosted page could not be fetched. Check the public URL and try again.",
          );
    const status =
      hostedError.code === "HOSTED_URL_TOO_LARGE"
        ? 413
        : hostedError.code === "HOSTED_URL_RATE_LIMITED"
          ? 429
          : hostedError.code.startsWith("HOSTED_URL_FETCH") ||
              hostedError.code === "HOSTED_URL_TIMEOUT" ||
              hostedError.code === "HOSTED_URL_DNS_FAILED" ||
              hostedError.code === "HOSTED_URL_DNS_REBINDING" ||
              hostedError.code === "HOSTED_URL_HTTP_ERROR" ||
              hostedError.code === "HOSTED_URL_NOT_HTML"
            ? 502
            : 400;
    req.log.warn({ code: hostedError.code, ip: req.ip }, "Hosted URL import rejected");
    res.status(status).json({
      error: hostedError.message,
      code: hostedError.code,
      action:
        status === 502
          ? "Check that the page is publicly reachable and serves HTML, then retry."
          : "Review the URL and remove credentials or private-network destinations before retrying.",
    });
  }
});

router.post("/port/playground/import", async (req, res): Promise<void> => {
  if (playgroundImportRateLimited(req)) {
    res.status(429).json({
      error: "Playground imports are temporarily rate limited. Wait a minute and try again.",
      code: "PLAYGROUND_RATE_LIMITED",
      action: "Wait before retrying, or use paste, file, ZIP, GitHub, or hosted URL import.",
    });
    return;
  }

  const body =
    typeof req.body === "object" && req.body !== null
      ? (req.body as { url?: unknown })
      : {};
  if (typeof body.url !== "string" || !body.url.trim()) {
    res.status(400).json({
      error: "Provide one complete public CodePen or JSFiddle URL.",
      code: "PLAYGROUND_URL_INVALID",
      action: "Use a public HTTPS link from CodePen or JSFiddle.",
    });
    return;
  }

  try {
    const result = await importPlayground(body.url);
    res.json(ImportPlaygroundResponse.parse(result));
  } catch (error) {
    const code = error instanceof PlaygroundError ? error.code : "PLAYGROUND_PROVIDER_UNAVAILABLE";
    const status =
      code === "PLAYGROUND_RESPONSE_TOO_LARGE"
        ? 413
        : code === "PLAYGROUND_PROVIDER_UNAVAILABLE" || code === "PLAYGROUND_TIMEOUT"
          ? 502
          : 400;
    res.status(status).json({
      error:
        error instanceof PlaygroundError
          ? error.message
          : "The playground provider could not be reached. Your current source is still safe.",
      code,
      action: "Retry the public link or use the hosted URL importer for a standalone HTML page.",
    });
  }
});

router.get("/port/poe/models", async (_req, res): Promise<void> => {
  const catalogue = await loadPoeModelCatalogue();
  if (catalogue.failed) {
    res.status(503).json({
      error: "Poe model availability could not be loaded. Retry model loading.",
      code: "POE_MODEL_UNAVAILABLE",
    });
    return;
  }
  res.set("Cache-Control", "private, max-age=30");
  res.json(ListPoeModelsResponse.parse(catalogue));
});

router.post("/port/poe/chat", async (req, res): Promise<void> => {
  const rateLimit = await takePoeChatRateLimit(req);
  if (!rateLimit.allowed) {
    if (rateLimit.storageUnavailable) {
      req.log.error("Poe rate-limit storage is unavailable");
      res.status(503).json({
        error: "Poe protection is temporarily unavailable. Try again later.",
        code: "POE_RATE_LIMIT_UNAVAILABLE",
      });
      return;
    }
    res
      .set("Retry-After", String(rateLimit.retryAfterSeconds))
      .status(429)
      .json({
        error: "Too many Poe requests from this address. Wait before trying again.",
        code: "POE_RATE_LIMITED",
      });
    return;
  }

  const parsed = ChatWithPoeBody.safeParse(req.body);
  if (!parsed.success) {
    const requestedTokens =
      typeof req.body === "object" &&
      req.body !== null &&
      "maxTokens" in req.body
        ? (req.body as { maxTokens?: unknown }).maxTokens
        : undefined;
    if (
      typeof requestedTokens === "number" &&
      requestedTokens > POE_CHAT_MAX_COMPLETION_TOKENS
    ) {
      res.status(400).json({
        error: `Poe completion tokens are limited to ${POE_CHAT_MAX_COMPLETION_TOKENS.toLocaleString()}.`,
        code: "POE_TOKEN_LIMIT_EXCEEDED",
      });
      return;
    }
    req.log.warn({ errors: parsed.error.message }, "Invalid Poe chat request");
    res.status(400).json({ error: "Provide a model and at least one message." });
    return;
  }

  if (
    parsed.data.messages.some((message: PoeMessage) =>
      containsPrivilegedCredential({
        version: 1,
        sourceType: "pasted_html",
        files: [{ path: "chat.txt", content: message.content }],
        entrypoint: "chat.txt",
        metadata: { displayName: "Poe chat" },
      }),
    )
  ) {
    res.status(400).json({
      error:
        "This chat request contains a service credential. Remove it before sending content to Poe; the request was not forwarded.",
      code: "CHAT_CONTAINS_CREDENTIAL",
    });
    return;
  }

  if (parsed.data.maxTokens && parsed.data.maxTokens > POE_CHAT_MAX_COMPLETION_TOKENS) {
    res.status(400).json({
      error: `Poe completion tokens are limited to ${POE_CHAT_MAX_COMPLETION_TOKENS.toLocaleString()}.`,
      code: "POE_TOKEN_LIMIT_EXCEEDED",
    });
    return;
  }

  if (Buffer.byteLength(JSON.stringify(parsed.data), "utf8") > POE_CHAT_REQUEST_MAX_BYTES) {
    res.status(413).json({
      error: "Poe chat requests must be smaller than 512 KiB.",
      code: "POE_CHAT_REQUEST_TOO_LARGE",
    });
    return;
  }

  try {
    const catalogue = await loadPoeModelCatalogue();
    if (
      !catalogue.configured ||
      !catalogue.available ||
      !isPoeModelConfirmed(catalogue.models, parsed.data.model)
    ) {
      req.log.warn(
        { configured: catalogue.configured, available: catalogue.available },
        "Poe model was not confirmed by the live catalogue",
      );
      res.status(503).json({
        error: "The requested Poe model is not currently available. Refresh model availability and try again.",
        code: "POE_MODEL_UNAVAILABLE",
      });
      return;
    }

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
        error: `Poe returned ${response.status}. Check POE_API_KEY, account access, and the exact model identifier.`,
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

router.get("/port/replit-project-connection", requireAuth, async (req, res): Promise<void> => {
  const connected = await hasProjectCreationConnection();
  res.json(
    GetReplitProjectConnectionResponse.parse({
      status: connected ? "connected" : "setup_required",
    }),
  );
});

router.get("/port/replit-project-connection/setup", requireAuth, async (req, res): Promise<void> => {
  const connected = await hasProjectCreationConnection();
  res.json(
    GetReplitProjectConnectionSetupResponse.parse({
      status: connected ? "connected" : "setup_required",
      setupUrl: connected ? null : projectConnectionSetupUrl(),
    }),
  );
});

router.post(
  "/port/replit-projects",
  requireTrustedCookieOrigin,
  requireAuth,
  async (req, res): Promise<void> => {
  const parsed = CreateReplitProjectBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid Replit project handoff request");
    const tooLarge = parsed.error.issues.some(
      (issue: { code: string }) => issue.code === "too_big",
    );
    res.status(tooLarge ? 413 : 400).json({
      error: `Provide exactly one valid source bundle no larger than ${SOURCE_TEXT_LIMIT_LABEL}.`,
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
      error: `Provide exactly one valid source bundle no larger than ${SOURCE_TEXT_LIMIT_LABEL}.`,
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
      ownerId: req.dbUser!.id,
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
        slug: step.skillId,
        status: "pending",
      })),
    );
  });
  res.status(202).json(CreateReplitProjectResponse.parse(publicJob(job)));
  void runHandoffJob(job.id);
  },
);

router.get("/port/replit-projects/:jobId", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetReplitProjectStatusParams.safeParse(req.params);
  const job = parsed.success
    ? await loadJob(parsed.data.jobId, req.dbUser!.id)
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
  requireAuth,
  async (req, res): Promise<void> => {
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
            eq(handoffJobsTable.ownerId, req.dbUser!.id),
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
      const existing = await loadJob(parsed.data.jobId, req.dbUser!.id);
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

    const job = await loadJob(parsed.data.jobId, req.dbUser!.id);
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

const SAFE_PATH =
  /^(?!\/)(?![a-zA-Z]:\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/-]+$/;

const MAX_BUNDLE_FILES = 200;
const SOURCE_TEXT_LIMIT_LABEL = `${SOURCE_TEXT_MAX_BYTES / 1024 ** 2} MB`;
const MAX_BUNDLE_BYTES = SOURCE_TEXT_MAX_BYTES;
const MAX_FILE_BYTES = SOURCE_TEXT_MAX_BYTES;

function getAnalysisBoundaryCode(input: unknown): string | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as { html?: unknown; bundle?: unknown };
  if (record.html !== undefined && record.bundle !== undefined) return null;

  if (record.html !== undefined) {
    if (typeof record.html !== "string") return null;
    if (!record.html.trim()) return "BUNDLE_EMPTY";
    if (new TextEncoder().encode(record.html).length > MAX_BUNDLE_BYTES) {
      return "BUNDLE_TOO_LARGE";
    }
    return null;
  }

  if (typeof record.bundle !== "object" || record.bundle === null) return null;
  const bundle = record.bundle as { files?: unknown };
  if (!Array.isArray(bundle.files)) return null;
  if (bundle.files.length === 0) return "BUNDLE_EMPTY";
  if (bundle.files.length > MAX_BUNDLE_FILES) return "BUNDLE_TOO_MANY_FILES";

  let totalBytes = 0;
  for (const file of bundle.files) {
    if (typeof file !== "object" || file === null) return null;
    const content = (file as { content?: unknown }).content;
    if (typeof content !== "string") return null;
    const bytes = new TextEncoder().encode(content).length;
    if (bytes > MAX_FILE_BYTES) return "BUNDLE_FILE_TOO_LARGE";
    totalBytes += bytes;
  }
  return totalBytes > MAX_BUNDLE_BYTES ? "BUNDLE_TOO_LARGE" : null;
}

function normalizeBundle(input: { html?: string; bundle?: SourceBundle }): SourceBundle {
  if (input.html !== undefined && input.bundle !== undefined) {
    throw new Error("BUNDLE_AMBIGUOUS");
  }
  if (input.bundle) {
    const bundle = input.bundle;
    const normalizedEntrypoint = bundle.entrypoint.replaceAll("\\", "/");
    const normalizedFiles = bundle.files.map((file) => ({
      ...file,
      path: file.path.replaceAll("\\", "/"),
    }));
    const seen = new Set<string>();
    let totalBytes = 0;
    if (normalizedFiles.length > MAX_BUNDLE_FILES) throw new Error("BUNDLE_TOO_MANY_FILES");
    for (const file of normalizedFiles) {
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
    if (!seen.has(normalizedEntrypoint)) throw new Error("BUNDLE_ENTRYPOINT_MISSING");
    if (!normalizedFiles.find((file) => file.path === normalizedEntrypoint)?.content.trim()) {
      throw new Error("BUNDLE_ENTRYPOINT_EMPTY");
    }
    return {
      ...bundle,
      entrypoint: normalizedEntrypoint,
      files: normalizedFiles,
    };
  }
  if (typeof input.html !== "string" || !input.html.trim()) throw new Error("BUNDLE_EMPTY");
  if (new TextEncoder().encode(input.html).length > SOURCE_TEXT_MAX_BYTES) throw new Error("BUNDLE_TOO_LARGE");
  return {
    version: 1,
    sourceType: "pasted_html",
    files: [{ path: "index.html", content: input.html }],
    entrypoint: "index.html",
    metadata: { displayName: extractTitle(input.html) },
  };
}

export default router;
