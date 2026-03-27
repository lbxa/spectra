import type { InsertionRelation } from "../lib/library/messages";
import type { SavedComponent } from "../lib/library/types";
import { scopeCapturedCss } from "./css-scope";

export type InsertedPreview = {
  previewId: string;
  wrapper: HTMLDivElement;
  content: HTMLDivElement;
};

const WRAPPER_ATTR = "data-spectra-preview-id";
const CONTENT_ATTR = "data-spectra-preview-content";
const TOOLBAR_ATTR = "data-spectra-preview-toolbar";

export function removeExistingPreview(): void {
  const existing = document.querySelector(`[${WRAPPER_ATTR}]`);
  if (existing instanceof HTMLElement) {
    existing.remove();
  }
}

export function insertPreview(
  host: HTMLElement,
  component: SavedComponent,
  relation: InsertionRelation
): InsertedPreview {
  removeExistingPreview();

  const previewId = `preview_${Date.now()}`;
  const wrapper = document.createElement("div");
  wrapper.setAttribute(WRAPPER_ATTR, previewId);
  wrapper.style.position = "relative";
  wrapper.style.outline = "2px solid rgba(37,99,235,0.35)";
  wrapper.style.outlineOffset = "2px";
  wrapper.style.borderRadius = "8px";
  wrapper.style.margin = relation === "inside-end" ? "8px 0 0" : "6px 0";

  const toolbarSlot = document.createElement("div");
  toolbarSlot.setAttribute(TOOLBAR_ATTR, "true");
  const content = document.createElement("div");
  content.setAttribute(CONTENT_ATTR, "true");
  content.innerHTML = component.html;

  const scopedCss = scopeCapturedCss(component.cssText || "", `[${WRAPPER_ATTR}="${previewId}"]`);
  if (scopedCss) {
    const style = document.createElement("style");
    style.textContent = scopedCss;
    wrapper.appendChild(style);
  }

  wrapper.append(toolbarSlot, content);
  applyInsertion(host, wrapper, relation);

  return {
    previewId,
    wrapper,
    content
  };
}

function applyInsertion(host: HTMLElement, wrapper: HTMLDivElement, relation: InsertionRelation): void {
  if (relation === "before" && host.parentElement) {
    host.parentElement.insertBefore(wrapper, host);
    return;
  }

  if (relation === "after" && host.parentElement) {
    host.parentElement.insertBefore(wrapper, host.nextSibling);
    return;
  }

  host.appendChild(wrapper);
}
