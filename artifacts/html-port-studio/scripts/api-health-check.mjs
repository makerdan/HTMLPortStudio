import { readFileSync } from "node:fs";

const API_ARTIFACT_MANIFEST = new URL(
  "../../api-server/.replit-artifact/artifact.toml",
  import.meta.url,
);
export const API_HEALTH_TIMEOUT_MS = 2_000;

function portFromManifest(manifestText) {
  const match = manifestText.match(/^\s*localPort\s*=\s*(\d+)\s*$/m);
  if (!match) throw new Error("API artifact manifest has no localPort");
  return match[1];
}

export function resolveApiHealthUrl({
  port = process.env.PLAYWRIGHT_API_PORT,
  manifestText,
} = {}) {
  const rawPort =
    port ?? portFromManifest(manifestText ?? readFileSync(API_ARTIFACT_MANIFEST, "utf8"));
  const numericPort = Number(rawPort);
  if (
    !Number.isInteger(numericPort) ||
    numericPort < 1 ||
    numericPort > 65535
  ) {
    throw new Error(`Invalid API health port: "${rawPort}"`);
  }
  return `http://127.0.0.1:${numericPort}/api/healthz`;
}

export async function assertApiHealthResponse(response) {
  if (!response || response.ok !== true) {
    const status = Number.isInteger(response?.status)
      ? `HTTP ${response.status}`
      : "no HTTP response";
    throw new Error(`API health check failed: ${status}`);
  }

  const contentType = response.headers?.get?.("content-type") ?? "";
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new Error(
      `API health check expected application/json, received ${
        mediaType || "no Content-Type"
      }`,
    );
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("API health check response body is not valid JSON");
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    body.status !== "ok"
  ) {
    throw new Error('API health check expected a JSON object with status "ok"');
  }
  return body;
}

export async function checkApiHealth(
  url = resolveApiHealthUrl(),
  { fetchImpl = globalThis.fetch, timeoutMs = API_HEALTH_TIMEOUT_MS } = {},
) {
  if (typeof fetchImpl !== "function") {
    throw new Error("API health check requires fetch");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000) {
    throw new Error("API health timeout must be an integer from 1 to 10000 ms");
  }

  const response = await fetchImpl(url, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
  return assertApiHealthResponse(response);
}