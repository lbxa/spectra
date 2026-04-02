import type { AdaptRequest, AdaptationPatch } from "../lib/library/messages";

const BACKEND_BASE_URL_STORAGE_KEY = "spectra.magic.backendBaseUrl";
const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_LOG_CHARS = 8_000;
declare const __DEBUG__: boolean;

type AdaptClientDeps = {
  fetch: typeof fetch;
  createAbortController: () => AbortController;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  getBackendBaseUrl: () => Promise<string>;
};

type RequestAdaptationFromBackendOptions = {
  timeoutMs?: number;
  deps?: Partial<AdaptClientDeps>;
};

const defaultAdaptClientDeps: AdaptClientDeps = {
  fetch: (input, init) => fetch(input, init),
  createAbortController: () => new AbortController(),
  setTimeout: (handler, timeout) => setTimeout(handler, timeout),
  clearTimeout: (timeoutId) => clearTimeout(timeoutId),
  getBackendBaseUrl
};

function resolveAdaptClientDeps(deps?: Partial<AdaptClientDeps>): AdaptClientDeps {
  return {
    ...defaultAdaptClientDeps,
    ...deps
  };
}

export async function requestAdaptationFromBackend(
  request: AdaptRequest,
  options: RequestAdaptationFromBackendOptions = {}
): Promise<AdaptationPatch> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deps = resolveAdaptClientDeps(options.deps);
  const baseUrl = await deps.getBackendBaseUrl();
  const controller = deps.createAbortController();
  const timeout = deps.setTimeout(() => controller.abort(), timeoutMs);
  const backendPayload = mapRequestForBackend(request);

  try {
    if (__DEBUG__) {
      console.info("[spectra][adapt][background][request]", {
        requestId: request.requestId ?? "none",
        baseUrl,
        payload: truncateValue(backendPayload),
        componentHtmlLength: request.componentPack.normalizedHtml.length,
        componentCssLength: request.componentPack.baseCss.length,
        themeTokenCount: Object.keys(request.targetSiteContext.globalThemeTokens).length
      });
    }

    const response = await deps.fetch(`${baseUrl}/v1/adapt`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(request.requestId ? { "x-request-id": request.requestId } : {})
      },
      body: JSON.stringify(backendPayload),
      signal: controller.signal
    });

    const rawResponseText = await safeReadText(response);
    if (__DEBUG__) {
      console.info("[spectra][adapt][background][response_raw]", {
        requestId: request.requestId ?? "none",
        status: response.status,
        body: truncateString(rawResponseText)
      });
    }

    if (!response.ok) {
      throw new Error(rawResponseText || `Backend returned ${response.status}`);
    }

    const parsed = parseBackendResponse(rawResponseText);
    if (__DEBUG__) {
      console.info("[spectra][adapt][background][response_parsed]", {
        requestId: request.requestId ?? "none",
        ok: parsed?.ok ?? false,
        summary: parsed?.patch?.summary ?? "",
        confidence: parsed?.patch?.confidence ?? null,
        warningCount: parsed?.patch?.warnings?.length ?? 0
      });
    }

    if (!parsed) {
      throw new Error("Backend returned invalid JSON response");
    }
    if (!parsed.ok || !parsed.patch || parsed.patch.strategy !== "css_override") {
      throw new Error("Backend returned invalid adaptation payload");
    }
    return parsed.patch;
  } catch (error) {
    if (__DEBUG__) {
      console.error("[spectra][adapt][background][request_failed]", {
        requestId: request.requestId ?? "none",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Adaptation request timed out");
    }
    throw error;
  } finally {
    deps.clearTimeout(timeout);
  }
}

function parseBackendResponse(raw: string): {
  ok?: boolean;
  patch?: AdaptationPatch;
  message?: string;
} | null {
  try {
    return JSON.parse(raw) as {
      ok?: boolean;
      patch?: AdaptationPatch;
      message?: string;
    };
  } catch {
    return null;
  }
}

function mapRequestForBackend(request: AdaptRequest): unknown {
  return {
    targetSiteContext: {
      url: request.targetSiteContext.metadata.pageUrl,
      title: request.targetSiteContext.metadata.pageTitle,
      themeMode: "unknown",
      primaryFontFamily: request.targetSiteContext.globalThemeTokens["--font-family-base"] ?? "",
      colorTokens: request.targetSiteContext.globalThemeTokens,
      rootSelector: request.targetSiteContext.insertionContext.hostTag || "main",
      protectedNodeIds: request.targetSiteContext.hardConstraints.protectedNodeIds,
      insertionContext: request.targetSiteContext.insertionContext,
      nativeExemplars: request.targetSiteContext.nativeExemplars,
      metadata: request.targetSiteContext.metadata,
      hostSceneSummary: request.targetSiteContext.hostSceneSummary
    },
    componentPack: {
      componentId: "preview_component",
      title: request.componentPack.semanticRoleHint,
      html: request.componentPack.normalizedHtml,
      cssText: request.componentPack.baseCss,
      stableNodeIds: request.componentPack.stableNodeIds,
      semanticRoleHint: request.componentPack.semanticRoleHint,
      protectedNodeIds: request.componentPack.protectedNodeIds,
      wrapperRootId: request.componentPack.wrapperRootId,
      componentIntentSummary: request.componentPack.componentIntentSummary
    }
  };
}

async function getBackendBaseUrl(): Promise<string> {
  try {
    const stored = await chrome.storage.local.get(BACKEND_BASE_URL_STORAGE_KEY);
    const value = stored?.[BACKEND_BASE_URL_STORAGE_KEY];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim().replace(/\/+$/, "");
    }
  } catch {
    // Fall back to default URL when storage is unavailable.
  }
  return DEFAULT_BACKEND_BASE_URL;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

function truncateString(value: string): string {
  if (value.length <= MAX_LOG_CHARS) {
    return value;
  }
  return `${value.slice(0, MAX_LOG_CHARS)}… [truncated ${value.length - MAX_LOG_CHARS} chars]`;
}

function truncateValue<T>(value: T): T | string {
  const serialized = JSON.stringify(value);
  if (!serialized) {
    return value;
  }
  if (serialized.length <= MAX_LOG_CHARS) {
    return value;
  }
  return truncateString(serialized);
}
