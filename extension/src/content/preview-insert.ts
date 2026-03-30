import type { InsertionRelation, PreviewAlignment } from "../lib/library/messages";
import type { SavedComponent } from "../lib/library/types";
import { unwrapScopedCss } from "./capture-snapshot";
import { scopeCapturedCss } from "./css-scope";

export type InsertedPreview = {
  previewId: string;
  wrapper: HTMLDivElement;
  content: HTMLDivElement;
};

const WRAPPER_ATTR = "data-spectra-preview-id";
const CONTENT_ATTR = "data-spectra-preview-content";
const TOOLBAR_ATTR = "data-spectra-preview-toolbar";

export function removePreviewById(previewId: string): void {
  if (!previewId) {
    return;
  }
  const existing = document.querySelector(`[${WRAPPER_ATTR}="${previewId}"]`);
  if (existing instanceof HTMLElement) {
    existing.remove();
  }
}

export function removeAllPreviews(): void {
  for (const existing of Array.from(document.querySelectorAll(`[${WRAPPER_ATTR}]`))) {
    if (existing instanceof HTMLElement) {
      existing.remove();
    }
  }
}

export function insertPreview(
  host: HTMLElement,
  component: SavedComponent,
  relation: InsertionRelation,
  alignment: PreviewAlignment
): InsertedPreview {
  const previewId = `preview_${Date.now()}`;
  const wrapper = document.createElement("div");
  wrapper.setAttribute(WRAPPER_ATTR, previewId);
  wrapper.style.position = "relative";
  wrapper.style.outline = "2px solid rgba(37,99,235,0.35)";
  wrapper.style.outlineOffset = "2px";
  wrapper.style.borderRadius = "8px";
  wrapper.style.margin = relation === "inside" ? "8px 0 0" : "6px 0";

  const toolbarSlot = document.createElement("div");
  toolbarSlot.setAttribute(TOOLBAR_ATTR, "true");
  const content = document.createElement("div");
  content.setAttribute(CONTENT_ATTR, "true");
  content.innerHTML = component.html;

  const storedCss = unwrapScopedCss(component.cssText || "");
  const cssText = storedCss.isScoped
    ? storedCss.cssText
    : scopeCapturedCss(storedCss.cssText, `[${WRAPPER_ATTR}="${previewId}"]`);
  if (cssText) {
    const style = document.createElement("style");
    style.textContent = cssText;
    wrapper.appendChild(style);
  }

  wrapper.append(toolbarSlot, content);
  const alignmentContainer = applyInsertion(host, wrapper, relation);
  applyWrapperAlignment(wrapper, alignmentContainer, alignment);

  return {
    previewId,
    wrapper,
    content
  };
}

function applyInsertion(host: HTMLElement, wrapper: HTMLDivElement, relation: InsertionRelation): HTMLElement {
  if (relation === "before" && host.parentElement) {
    host.parentElement.insertBefore(wrapper, host);
    return host.parentElement;
  }

  if (relation === "after" && host.parentElement) {
    host.parentElement.insertBefore(wrapper, host.nextSibling);
    return host.parentElement;
  }

  host.appendChild(wrapper);
  return host;
}

function applyWrapperAlignment(
  wrapper: HTMLDivElement,
  container: HTMLElement,
  alignment: PreviewAlignment
): void {
  wrapper.style.justifySelf = "";
  wrapper.style.alignSelf = "";
  wrapper.style.marginInlineStart = "0";
  wrapper.style.marginInlineEnd = "0";

  const style = window.getComputedStyle(container);
  const display = style.display;

  if (display === "grid" || display === "inline-grid") {
    wrapper.style.justifySelf = alignment;
    return;
  }

  if (display === "flex" || display === "inline-flex") {
    if (style.flexDirection.startsWith("column")) {
      wrapper.style.alignSelf =
        alignment === "start" ? "flex-start" : alignment === "end" ? "flex-end" : "center";
    }
    return;
  }

  if (alignment === "center") {
    wrapper.style.marginInlineStart = "auto";
    wrapper.style.marginInlineEnd = "auto";
    return;
  }

  if (alignment === "end") {
    wrapper.style.marginInlineStart = "auto";
  }
}
