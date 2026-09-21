/**
 * The only server-side boundary for Poe. Do not expose this module to clients:
 * it owns the secret, provider origin, approved-model verification, and transport
 * failure policy.
 */

export const POE_ORIGIN = "https://api.poe.com";
const DEFAULT_BASE_URL = `${POE_ORIGIN}/v1`;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const MAX_RETRY_AFTER_MS = 2_000;

export type PoeCapabilityId =
  | "generic-assistant"
  | "gemini-repair"
  | "claude-repair";

export type PoeCapability = {
  version: 1;
  id: PoeCapabilityId;
  endpoint: "/v1/chat/completions";
  contract: "text-only";
  limits: { maxMessages: number; maxCompletionTokens: number };
  privacyClass: "user-content" | "redacted-source";
  fallback: "none" | "generic-assistant";
  owner: "api-server";
  reviewEvidence: string;
  capabilities: {
    toolCalling: "unavailable";
    vision: "unavailable";
    structuredOutput: "unavailable";
    streaming: "unavailable";
  };
};

export type PoeModel = {
  id: string;
  provider: "poe";
  capabilities: PoeCapabilityId[];
  fallbackEligible: boolean;
  primary: boolean;
  privacyClasses: Array<"user-content" | "redacted-source">;
};

/**
 * This is intentionally the complete allowlist. Do not replace it with a
 * provider catalogue: model selection is a server-owned policy decision.
 */
export const POE_MODELS: Readonly<Record<string, PoeModel>> = {
  "Claude-Sonnet-4.6": {
    id: "Claude-Sonnet-4.6",
    provider: "poe",
    capabilities: ["claude-repair", "generic-assistant"],
    fallbackEligible: true,
    primary: false,
    privacyClasses: ["user-content", "redacted-source"],
  },
  "Gemini-2.5-Pro": {
    id: "Gemini-2.5-Pro",
    provider: "poe",
    capabilities: ["gemini-repair", "generic-assistant"],
    fallbackEligible: true,
    primary: true,
    privacyClasses: ["user-content", "redacted-source"],
  },
  "Assistant": {
    id: "Assistant",
    provider: "poe",
    capabilities: ["generic-assistant"],
    fallbackEligible: true,
    primary: false,
    privacyClasses: ["user-content"],
  },
};

export const REPLIT_AI_FALLBACK = {
  id: "gpt-5.6-terra",
  provider: "replit-ai-integrations",
  capability: "generic-assistant" as const,
  privacyClass: "user-content" as const,
  fallbackEligible: true,
};

export const POE_CAPABILITIES: Readonly<Record<PoeCapabilityId, PoeCapability>> = {
  "generic-assistant": {
    version: 1,
    id: "generic-assistant",
    endpoint: "/v1/chat/completions",
    contract: "text-only",
    limits: { maxMessages: 40, maxCompletionTokens: 4096 },
    privacyClass: "user-content",
    fallback: "none",
    owner: "api-server",
    reviewEvidence: "Reviewed server-owned allowlist and text-only boundary",
    capabilities: { toolCalling: "unavailable", vision: "unavailable", structuredOutput: "unavailable", streaming: "unavailable" },
  },
  "gemini-repair": {
    version: 1,
    id: "gemini-repair",
    endpoint: "/v1/chat/completions",
    contract: "text-only",
    limits: { maxMessages: 40, maxCompletionTokens: 4096 },
    privacyClass: "redacted-source",
    fallback: "generic-assistant",
    owner: "api-server",
    reviewEvidence: "Reviewed server-owned allowlist and redacted-source repair boundary",
    capabilities: { toolCalling: "unavailable", vision: "unavailable", structuredOutput: "unavailable", streaming: "unavailable" },
  },
  "claude-repair": {
    version: 1,
    id: "claude-repair",
    endpoint: "/v1/chat/completions",
    contract: "text-only",
    limits: { maxMessages: 40, maxCompletionTokens: 4096 },
    privacyClass: "redacted-source",
    fallback: "generic-assistant",
    owner: "api-server",
    reviewEvidence: "Reviewed server-owned allowlist and redacted-source repair boundary",
    capabilities: { toolCalling: "unavailable", vision: "unavailable", structuredOutput: "unavailable", streaming: "unavailable" },
  },
};

export type PoeErrorCode =
  | "POE_NOT_CONFIGURED"
  | "POE_TIMEOUT"
  | "POE_ABORTED"
  | "POE_REDIRECT_REJECTED"
  | "POE_MODEL_UNREGISTERED"
  | "POE_CAPABILITY_UNSUPPORTED"
  | "POE_CATALOGUE_INVALID"
  | "POE_PROVIDER_UNAVAILABLE"
  | "POE_COMPLETION_INVALID";

export class PoeProviderError extends Error {
  readonly code: PoeErrorCode;
  readonly status?: number;
  constructor(code: PoeErrorCode, status?: number) {
    super(code);
    this.name = "PoeProviderError";
    this.code = code;
    this.status = status;
  }
}

function baseUrl(): string {
  // Tests may use a local deterministic Poe stub. Production always uses the
  // fixed Poe origin; user input is never accepted here.
  const configured = process.env.POE_API_BASE_URL;
  if (configured && process.env.NODE_ENV === "test") return configured.replace(/\/+$/, "");
  return DEFAULT_BASE_URL;
}

function retryAfterMs(response: Response): number {
  const value = response.headers.get("retry-after");
  if (!value) return 0;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.min(MAX_RETRY_AFTER_MS, seconds * 1000);
}

function transientStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500 && status <= 504;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new PoeProviderError("POE_ABORTED"));
    }, { once: true });
  });
}

export async function poeRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const apiKey = process.env.POE_API_KEY2;
  if (!apiKey) throw new PoeProviderError("POE_NOT_CONFIGURED");
  const configuredBase = `${baseUrl()}/`;
  const url = new URL(`.${path.startsWith("/") ? path : `/${path}`}`, configuredBase);
  const configuredOrigin = new URL(configuredBase).origin;
  if (url.origin !== configuredOrigin || url.protocol !== "https:" && process.env.NODE_ENV !== "test") {
    throw new PoeProviderError("POE_REDIRECT_REJECTED");
  }
  const callerSignal = init.signal;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abortCaller = () => controller.abort();
    callerSignal?.addEventListener("abort", abortCaller, { once: true });
    try {
      const response = await fetch(url, {
        ...init,
        redirect: "manual",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...init.headers },
      });
      if (response.status >= 300 && response.status < 400) throw new PoeProviderError("POE_REDIRECT_REJECTED");
      if (response.ok || !transientStatus(response.status) || attempt === MAX_RETRIES) return response;
      await sleep(retryAfterMs(response) || 50 * (attempt + 1), callerSignal ?? undefined);
    } catch (error) {
      if (error instanceof PoeProviderError) throw error;
      if (callerSignal?.aborted) throw new PoeProviderError("POE_ABORTED");
      if (controller.signal.aborted) {
        throw new PoeProviderError("POE_TIMEOUT");
      }
      if (attempt === MAX_RETRIES) throw new PoeProviderError("POE_PROVIDER_UNAVAILABLE");
      await sleep(50 * (attempt + 1), callerSignal ?? undefined);
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortCaller);
    }
  }
  throw new PoeProviderError("POE_PROVIDER_UNAVAILABLE");
}

export function getPoeModel(modelId: string, capability: PoeCapabilityId): PoeModel {
  const model = POE_MODELS[modelId];
  if (!model) throw new PoeProviderError("POE_MODEL_UNREGISTERED");
  if (!model.capabilities.includes(capability)) {
    throw new PoeProviderError("POE_CAPABILITY_UNSUPPORTED");
  }
  return model;
}

export function getApprovedPoeModels(capability?: PoeCapabilityId): PoeModel[] {
  return Object.values(POE_MODELS).filter((model) =>
    capability ? model.capabilities.includes(capability) : true,
  );
}

/** Compatibility helpers for older callers; routing never calls Poe catalogue APIs. */
export function isPoeModelConfirmed(models: readonly string[], requestedModel: string): boolean {
  return models.some((model) => model === requestedModel);
}

export function validateCatalogue(body: unknown): string[] {
  if (typeof body !== "object" || body === null || !Array.isArray((body as { data?: unknown }).data)) {
    throw new PoeProviderError("POE_CATALOGUE_INVALID");
  }
  const models = (body as { data: unknown[] }).data.map((entry) =>
    typeof entry === "object" && entry !== null && typeof (entry as { id?: unknown }).id === "string"
      ? (entry as { id: string }).id
      : null,
  );
  if (models.some((model) => !model)) throw new PoeProviderError("POE_CATALOGUE_INVALID");
  return [...new Set(models as string[])];
}

export function parseCompletion(body: unknown): {
  model?: string;
  content: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
} {
  const value = body as { model?: unknown; choices?: Array<{ message?: { content?: unknown } }>; usage?: unknown };
  const content = value?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new PoeProviderError("POE_COMPLETION_INVALID");
  const usage = typeof value.usage === "object" && value.usage !== null ? value.usage as { prompt_tokens?: unknown; completion_tokens?: unknown } : undefined;
  return {
    model: typeof value.model === "string" ? value.model : undefined,
    content,
    usage: usage ? {
      prompt_tokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : 0,
      completion_tokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : 0,
    } : undefined,
  };
}

export function resetPoeProviderForTests(): void {
  // Kept as an explicit seam for tests and future process-level cache reset.
}