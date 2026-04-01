import type { AdaptRequest, AdaptationPatch } from "../../lib/adaptation/types";
import type { RequestAdaptationPatchResponse } from "../../lib/library/messages";

const ADAPTATION_BASE_URL_STORAGE_KEY = "spectra.adaptation.baseUrl";
const DEFAULT_ADAPTATION_BASE_URL = "http://127.0.0.1:8090";
const ADAPTATION_TIMEOUT_MS = 12_000;

export async function requestAdaptationPatch(
  payload: AdaptRequest
): Promise<RequestAdaptationPatchResponse> {
  const baseUrl = await resolveAdaptationServiceBaseUrl();
  const endpoint = `${baseUrl}/v1/adapt`;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort();
  }, ADAPTATION_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (response.status === 200) {
      const patchPayload: unknown = await response.json();
      if (!isAdaptationPatch(patchPayload)) {
        return {
          ok: false,
          code: "validation_failed",
          error: "Adaptation response payload shape is invalid"
        };
      }
      return {
        ok: true,
        patch: patchPayload
      };
    }

    if (response.status === 400) {
      return {
        ok: false,
        code: "validation_failed",
        error: "Adaptation request was invalid"
      };
    }

    if (response.status === 422) {
      return {
        ok: false,
        code: "validation_failed",
        error: "Adaptation patch did not pass validation"
      };
    }

    if (response.status === 504) {
      return {
        ok: false,
        code: "timeout",
        error: "Adaptation timed out"
      };
    }

    if (response.status === 502 || response.status >= 500) {
      return {
        ok: false,
        code: "upstream_error",
        error: "Adaptation model request failed"
      };
    }

    return {
      ok: false,
      code: "unknown_error",
      error: `Unexpected adaptation response: ${response.status}`
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        code: "timeout",
        error: "Adaptation timed out"
      };
    }
    return {
      ok: false,
      code: "unknown_error",
      error: error instanceof Error ? error.message : "Adaptation request failed"
    };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function isAdaptationPatch(value: unknown): value is AdaptationPatch {
  if (!value || typeof value !== "object") {
    return false;
  }

  const strategy = Reflect.get(value, "strategy");
  const summary = Reflect.get(value, "summary");
  const overrideCss = Reflect.get(value, "overrideCss");
  const confidence = Reflect.get(value, "confidence");
  const warnings = Reflect.get(value, "warnings");
  const preservedNodeIds = Reflect.get(value, "preservedNodeIds");
  const attributeEdits = Reflect.get(value, "attributeEdits");

  if (
    strategy !== "css_override" ||
    typeof summary !== "string" ||
    typeof overrideCss !== "string" ||
    typeof confidence !== "number"
  ) {
    return false;
  }

  if (!Array.isArray(warnings) || !warnings.every((warning) => typeof warning === "string")) {
    return false;
  }
  if (
    !Array.isArray(preservedNodeIds) ||
    !preservedNodeIds.every((nodeId) => typeof nodeId === "string")
  ) {
    return false;
  }
  if (!Array.isArray(attributeEdits)) {
    return false;
  }

  return attributeEdits.every((edit) => {
    if (!edit || typeof edit !== "object") {
      return false;
    }
    return (
      typeof Reflect.get(edit, "nodeId") === "string" &&
      typeof Reflect.get(edit, "name") === "string" &&
      typeof Reflect.get(edit, "value") === "string"
    );
  });
}

async function resolveAdaptationServiceBaseUrl(): Promise<string> {
  const stored = await chrome.storage.local.get([ADAPTATION_BASE_URL_STORAGE_KEY]);
  const candidate = stored[ADAPTATION_BASE_URL_STORAGE_KEY];
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return trimTrailingSlash(candidate);
  }
  return DEFAULT_ADAPTATION_BASE_URL;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
