import type { AdaptationPatch, ComponentPack } from "../../lib/library/messages";

const NODE_ID_ATTR = "data-spectra-node-id";
const CONTENT_SCOPE_SELECTOR = "[data-spectra-preview-content='true']";

export type AppliedAdaptationResult = {
  html: string;
  cssText: string;
  warnings: string[];
};

export function applyAdaptationPatch(
  componentPack: ComponentPack,
  patch: AdaptationPatch
): AppliedAdaptationResult {
  const scopedOverrideCss = constrainOverrideCssToPreviewContent(patch.overrideCss);
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div id="${componentPack.wrapperRootId}">${componentPack.normalizedHtml}</div>`, "text/html");
  const root = parsed.body.firstElementChild as HTMLElement | null;
  if (!root) {
    return {
      html: componentPack.normalizedHtml,
      cssText: [componentPack.baseCss, scopedOverrideCss].filter(Boolean).join("\n"),
      warnings: ["Adaptation root not found; applied CSS only"]
    };
  }

  for (const edit of patch.attributeEdits) {
    const selector = `[${NODE_ID_ATTR}="${CSS.escape(edit.nodeId)}"]`;
    const node = root.querySelector<HTMLElement>(selector);
    if (!node) {
      continue;
    }
    node.setAttribute(edit.name, edit.value);
  }

  return {
    html: root.innerHTML,
    cssText: [componentPack.baseCss, scopedOverrideCss].filter(Boolean).join("\n"),
    warnings: patch.warnings
  };
}

function constrainOverrideCssToPreviewContent(overrideCss: string): string {
  if (!overrideCss.trim()) {
    return "";
  }
  // Keep override rules constrained to inserted preview content, not the toolbar slot.
  return overrideCss.replaceAll(":scope", CONTENT_SCOPE_SELECTOR);
}
