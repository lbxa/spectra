import type {
  RequestAdaptationPatchMessage,
  RequestAdaptationPatchResponse
} from "../../lib/library/messages";
import type { AdaptRequest, AdaptationPatch } from "../../lib/adaptation/types";

export async function requestAdaptation(
  payload: AdaptRequest
): Promise<RequestAdaptationPatchResponse> {
  const response = await chrome.runtime.sendMessage({
    type: "REQUEST_ADAPTATION_PATCH",
    payload
  } satisfies RequestAdaptationPatchMessage);

  if (!response || typeof response !== "object") {
    return {
      ok: false,
      code: "unknown_error",
      error: "No response from adaptation service"
    };
  }

  const ok = Reflect.get(response, "ok");
  if (ok === true) {
    const patchCandidate = Reflect.get(response, "patch");
    if (!isAdaptationPatch(patchCandidate)) {
      return {
        ok: false,
        code: "unknown_error",
        error: "Adaptation response missing patch payload"
      };
    }
    return {
      ok: true,
      patch: patchCandidate
    };
  }
  const codeCandidate = Reflect.get(response, "code");
  const code =
    codeCandidate === "validation_failed" ||
    codeCandidate === "timeout" ||
    codeCandidate === "upstream_error" ||
    codeCandidate === "unsafe_patch" ||
    codeCandidate === "unknown_error"
      ? codeCandidate
      : "unknown_error";
  const errorCandidate = Reflect.get(response, "error");
  return {
    ok: false,
    code,
    error: typeof errorCandidate === "string" ? errorCandidate : "Adaptation request failed"
  };
}

function isAdaptationPatch(value: unknown): value is AdaptationPatch {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (
    Reflect.get(value, "strategy") === "css_override" &&
    typeof Reflect.get(value, "summary") === "string" &&
    typeof Reflect.get(value, "overrideCss") === "string" &&
    typeof Reflect.get(value, "confidence") === "number"
  );
}
