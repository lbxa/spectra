import type {
  SaveAdaptedComponentRevisionMessage,
  SaveAdaptedComponentRevisionResponse
} from "../../lib/library/messages";

type PersistAdaptedRevisionInput = {
  componentId: string;
  adaptedHtml: string;
  adaptedCssText: string;
  summary: string;
  warnings: string[];
  confidence: number;
  themeFingerprint: string;
};

export async function persistAdaptedRevision(
  input: PersistAdaptedRevisionInput
): Promise<SaveAdaptedComponentRevisionResponse> {
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_ADAPTED_COMPONENT_REVISION",
    payload: {
      componentId: input.componentId,
      adaptedHtml: input.adaptedHtml,
      adaptedCssText: input.adaptedCssText,
      summary: input.summary,
      warnings: input.warnings,
      confidence: input.confidence,
      themeFingerprint: input.themeFingerprint
    }
  } satisfies SaveAdaptedComponentRevisionMessage);

  if (!response || typeof response !== "object") {
    return {
      ok: false,
      error: "No response while saving adapted revision"
    };
  }

  const ok = Reflect.get(response, "ok");
  if (ok === true) {
    const componentCandidate = Reflect.get(response, "component");
    return {
      ok: true,
      component: componentCandidate && typeof componentCandidate === "object" ? componentCandidate : undefined
    };
  }

  const errorCandidate = Reflect.get(response, "error");
  return {
    ok: false,
    error: typeof errorCandidate === "string" ? errorCandidate : "Failed to save adapted revision"
  };
}
