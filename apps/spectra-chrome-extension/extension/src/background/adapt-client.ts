import type { AdaptRequest, AdaptationPatch } from "../lib/library/messages";

const BACKEND_BASE_URL_STORAGE_KEY = "spectra.magic.backendBaseUrl";
const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_TIMEOUT_MS = 45_000;

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

  try {
    const response = await deps.fetch(`${baseUrl}/v1/adapt`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(mapRequestForBackend(request)),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await safeReadText(response);
      throw new Error(body || `Backend returned ${response.status}`);
    }

    const parsed = (await response.json()) as {
      ok?: boolean;
      patch?: AdaptationPatch;
      message?: string;
    };
    if (!parsed?.ok || !parsed.patch || parsed.patch.strategy !== "css_override") {
      throw new Error("Backend returned invalid adaptation payload");
    }
    return parsed.patch;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Adaptation request timed out");
    }
    throw error;
  } finally {
    deps.clearTimeout(timeout);
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
      protectedNodeIds: request.targetSiteContext.hardConstraints.protectedNodeIds
    },
    componentPack: {
      componentId: "preview_component",
      title: request.componentPack.semanticRoleHint,
      html: request.componentPack.normalizedHtml,
      cssText: request.componentPack.baseCss
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
