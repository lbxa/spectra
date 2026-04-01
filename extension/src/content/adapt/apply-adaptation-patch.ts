import type { AdaptationPatch } from "../../lib/adaptation/types";
import type { InsertedPreviewRecord } from "../preview-runtime/inserted-preview-registry";

const STABLE_NODE_ID_ATTR = "data-spectra-node-id";

type ApplyAdaptationPatchInput = {
  record: InsertedPreviewRecord;
  patch: AdaptationPatch;
};

export function applyAdaptationPatch(input: ApplyAdaptationPatchInput): {
  adaptedHtml: string;
  adaptedCssText: string;
} {
  const { record, patch } = input;
  const wrapper = record.inserted.wrapper;
  const content = record.inserted.content;

  const clonedContent = content.cloneNode(true);
  if (!(clonedContent instanceof HTMLElement)) {
    throw new Error("Could not clone preview content for adaptation");
  }

  const nodeById = mapNodesByStableId(clonedContent);
  for (const edit of patch.attributeEdits) {
    const targetNode = nodeById.get(edit.nodeId);
    if (!targetNode) {
      throw new Error(`Could not locate node for attribute edit: ${edit.nodeId}`);
    }
    targetNode.setAttribute(edit.name, edit.value);
  }

  content.innerHTML = "";
  while (clonedContent.firstChild) {
    content.appendChild(clonedContent.firstChild);
  }

  const adaptationStyleId = `spectra-adapt-style-${record.inserted.previewId}`;
  let adaptationStyle = wrapper.querySelector(`[data-spectra-adapt-style="${record.inserted.previewId}"]`);
  if (!(adaptationStyle instanceof HTMLStyleElement)) {
    adaptationStyle = document.createElement("style");
    adaptationStyle.id = adaptationStyleId;
    adaptationStyle.setAttribute("data-spectra-adapt-style", record.inserted.previewId);
    wrapper.appendChild(adaptationStyle);
  }
  adaptationStyle.textContent = patch.overrideCss;

  const adaptedHtml = content.innerHTML;
  const baseStyleNode = Array.from(wrapper.querySelectorAll("style")).find(
    (styleNode) => styleNode !== adaptationStyle
  );
  const baseCssText = baseStyleNode instanceof HTMLStyleElement ? baseStyleNode.textContent ?? "" : "";
  const adaptedCssText = [baseCssText, patch.overrideCss].filter((chunk) => chunk.trim().length > 0).join("\n");
  return {
    adaptedHtml,
    adaptedCssText
  };
}

function mapNodesByStableId(contentRoot: HTMLElement): Map<string, HTMLElement> {
  const byId = new Map<string, HTMLElement>();
  if (contentRoot.hasAttribute(STABLE_NODE_ID_ATTR)) {
    const rootId = contentRoot.getAttribute(STABLE_NODE_ID_ATTR);
    if (rootId) {
      byId.set(rootId, contentRoot);
    }
  }
  const elements = Array.from(contentRoot.querySelectorAll<HTMLElement>(`[${STABLE_NODE_ID_ATTR}]`));
  for (const element of elements) {
    const id = element.getAttribute(STABLE_NODE_ID_ATTR);
    if (!id) {
      continue;
    }
    byId.set(id, element);
  }
  return byId;
}
