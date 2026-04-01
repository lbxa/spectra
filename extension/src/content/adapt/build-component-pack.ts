import type { ComponentPack } from "../../lib/adaptation/types";
import { unwrapScopedCss } from "../capture-snapshot";
import { scopeCapturedCss } from "../css-scope";
import type { InsertedPreviewRecord } from "../preview-runtime/inserted-preview-registry";

const STABLE_NODE_ID_ATTR = "data-spectra-node-id";
const WRAPPER_ROOT_ID_PREFIX = "spectra-adapt-root";

export function buildComponentPack(record: InsertedPreviewRecord): ComponentPack {
  const wrapperRootId = ensureWrapperRootId(record.inserted.wrapper, record.inserted.previewId);
  const stableNodeIds = ensureStableNodeIds(record.inserted.content, record.inserted.previewId);
  const protectedNodeIds = collectProtectedNodeIds(record.inserted.content);
  const normalizedHtml = record.inserted.content.innerHTML;
  const baseCss = toBaseCss(record.component.cssText, wrapperRootId);

  return {
    wrapperRootId,
    semanticRoleHint: deriveSemanticRoleHint(record.inserted.content),
    normalizedHtml,
    baseCss,
    stableNodeIds,
    protectedNodeIds
  };
}

function toBaseCss(componentCssText: string, wrapperRootId: string): string {
  const storedCss = unwrapScopedCss(componentCssText || "");
  if (storedCss.isScoped) {
    return storedCss.cssText;
  }
  return scopeCapturedCss(storedCss.cssText, `#${CSS.escape(wrapperRootId)}`);
}

function ensureWrapperRootId(wrapper: HTMLElement, previewId: string): string {
  if (wrapper.id) {
    return wrapper.id;
  }
  const wrapperRootId = `${WRAPPER_ROOT_ID_PREFIX}-${previewId}`;
  wrapper.id = wrapperRootId;
  return wrapperRootId;
}

function ensureStableNodeIds(contentRoot: HTMLElement, previewId: string): string[] {
  const stableNodeIds: string[] = [];
  const elements = [contentRoot, ...Array.from(contentRoot.querySelectorAll("*"))];
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];
    const existingNodeId = element.getAttribute(STABLE_NODE_ID_ATTR);
    const nodeId = existingNodeId || `${previewId}-node-${index + 1}`;
    element.setAttribute(STABLE_NODE_ID_ATTR, nodeId);
    stableNodeIds.push(nodeId);
  }
  return stableNodeIds;
}

function collectProtectedNodeIds(contentRoot: HTMLElement): string[] {
  const protectedIds: string[] = [];
  const interactiveNodes = Array.from(
    contentRoot.querySelectorAll(
      "a, button, input, select, textarea, [role='button'], [role='link'], [contenteditable='true']"
    )
  );
  for (const node of interactiveNodes) {
    const nodeId = node.getAttribute(STABLE_NODE_ID_ATTR);
    if (!nodeId) {
      continue;
    }
    protectedIds.push(nodeId);
  }
  return protectedIds;
}

function deriveSemanticRoleHint(contentRoot: HTMLElement): string {
  const firstElement = contentRoot.firstElementChild;
  if (!firstElement) {
    return "generic";
  }
  const explicitRole = firstElement.getAttribute("role");
  if (explicitRole) {
    return explicitRole;
  }
  return firstElement.tagName.toLowerCase();
}
