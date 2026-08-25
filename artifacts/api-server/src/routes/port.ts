import { Router, type IRouter } from "express";
import {
  AnalyzeHtmlBody,
  AnalyzeHtmlResponse,
  ChatWithPoeBody,
  ChatWithPoeResponse,
  ListPoeModelsResponse,
} from "@workspace/api-zod";

type Finding = {
  severity: "info" | "warning" | "blocker";
  title: string;
  detail: string;
  action: string;
};

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i);
  return match?.[1]?.trim() || "Untitled HTML app";
}

function countMatches(html: string, pattern: RegExp): number {
  return [...html.matchAll(pattern)].length;
}

function analyzeHtml(html: string) {
  const scriptTags = countMatches(html, /<script\b[^>]*>/gi);
  const externalScripts = countMatches(html, /<script\b[^>]*\bsrc\s*=/gi);
  const externalAssets = countMatches(
    html,
    /<(?:img|link|video|audio|source|iframe)\b[^>]*(?:src|href)\s*=\s*["']https?:\/\//gi,
  );
  const hasPoe = /api\.poe\.com|poe\.com\/v1|Poe[-_\s]?API/i.test(html);
  const hasAiClient = /api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|chat\/completions|google\.generativeai|new\s+OpenAI\b/i.test(
    html,
  );
  const hasBrowserKey = /(?:api[_-]?key|authorization)\s*[:=]\s*["'](?:sk-|pk-|poe-|Bearer\s)/i.test(
    html,
  );
  const hasFetch = /\bfetch\s*\(|XMLHttpRequest|axios\./i.test(html);
  const findings: Finding[] = [];

  if (!/<!doctype\s+html/i.test(html)) {
    findings.push({
      severity: "warning",
      title: "No HTML doctype found",
      detail: "The document does not declare <!doctype html>, which can trigger legacy browser rendering.",
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
      detail: "This looks like a self-contained HTML document without external scripts or recognizable API calls.",
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
    title: extractTitle(html),
    bytes: new TextEncoder().encode(html).length,
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

const router: IRouter = Router();

router.post("/port/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeHtmlBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid HTML analysis request");
    res.status(400).json({ error: "Provide one non-empty HTML document." });
    return;
  }

  res.json(AnalyzeHtmlResponse.parse(analyzeHtml(parsed.data.html)));
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

export default router;