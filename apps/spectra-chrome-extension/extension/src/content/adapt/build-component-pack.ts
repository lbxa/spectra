import type { ComponentPack } from "../../lib/library/messages";
import type { SavedComponent } from "../../lib/library/types";

const NODE_ID_ATTR = "data-spectra-node-id";
const WRAPPER_ROOT_ID = "spectra-root";

export function buildComponentPack(component: SavedComponent): ComponentPack {
  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(`<div>${component.html}</div>`, "text/html");
  const root = documentFragment.body.firstElementChild as HTMLElement | null;
  if (!root) {
    return {
      normalizedHtml: component.html,
      baseCss: component.cssText ?? "",
      stableNodeIds: [],
      semanticRoleHint: "unknown",
      protectedNodeIds: [],
      wrapperRootId: WRAPPER_ROOT_ID
    };
  }

  root.setAttribute("id", WRAPPER_ROOT_ID);
  const stableNodeIds: string[] = [];
  let counter = 0;
  const allNodes = Array.from(root.querySelectorAll<HTMLElement>("*"));
  for (const node of allNodes) {
    const existing = node.getAttribute(NODE_ID_ATTR) ?? node.id;
    const nodeId = existing && existing.length > 0 ? existing : `node_${counter++}`;
    node.setAttribute(NODE_ID_ATTR, nodeId);
    stableNodeIds.push(nodeId);
  }

  const normalizedHtml = root.innerHTML;
  return {
    normalizedHtml,
    baseCss: component.cssText ?? "",
    stableNodeIds,
    semanticRoleHint: inferSemanticRoleHint(root),
    protectedNodeIds: stableNodeIds.slice(0, 1),
    wrapperRootId: WRAPPER_ROOT_ID
  };
}

function inferSemanticRoleHint(root: HTMLElement): string {
  const role = root.getAttribute("role");
  if (role) {
    return role;
  }
  const tag = root.tagName.toLowerCase();
  if (tag === "nav" || tag === "header" || tag === "footer" || tag === "main" || tag === "form") {
    return tag;
  }
  if (root.querySelector("button,[role='button'],input[type='button'],input[type='submit']")) {
    return "interactive";
  }
  return "layout";
}
