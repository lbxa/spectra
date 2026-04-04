import type { ComponentIntentSummary, ComponentPack } from "../../lib/library/messages";
import type { SavedComponent } from "../../lib/library/types";

const NODE_ID_ATTR = "data-spectra-node-id";
const WRAPPER_ROOT_ID = "spectra-root";

export function buildComponentPack(component: SavedComponent): ComponentPack {
  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(`<div>${component.html}</div>`, "text/html");
  const root = documentFragment.body.firstElementChild as HTMLElement | null;
  const semanticRoleHint = root ? inferSemanticRoleHint(root) : "unknown";
  const componentIntentSummary = inferComponentIntentSummary(root, component.cssText ?? "", semanticRoleHint);
  if (!root) {
    return {
      normalizedHtml: component.html,
      baseCss: component.cssText ?? "",
      stableNodeIds: [],
      semanticRoleHint,
      componentIntentSummary,
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
    semanticRoleHint,
    componentIntentSummary,
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

function inferComponentIntentSummary(
  root: HTMLElement | null,
  cssText: string,
  semanticRoleHint: string
): ComponentIntentSummary {
  if (!root) {
    return {
      semanticRole: semanticRoleHint,
      emphasisLevel: "balanced",
      headingScale: 1,
      dominantWeight: 400,
      bodyWeight: 400,
      hasSurfaceBackground: false,
      hasSurfaceBorder: false,
      hasSurfaceShadow: false,
      cornerStyle: "sharp",
      colorIntent: "neutral"
    };
  }

  const headingCount = root.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']").length;
  const bodyTextCount = root.querySelectorAll("p,span,li,a,small,strong,em").length;
  const headingScale = headingCount > 0 && bodyTextCount > 0 ? 1.2 : headingCount > 0 ? 1.1 : 1;
  const dominantWeight = inferDominantWeight(cssText, root);
  const bodyWeight = inferBodyWeight(cssText);
  const hasSurfaceBackground = hasStyleSignal(cssText, root, ["background", "background-color"]);
  const hasSurfaceBorder = hasStyleSignal(cssText, root, ["border", "outline"]);
  const hasSurfaceShadow = hasStyleSignal(cssText, root, ["box-shadow"]);
  const cornerStyle = hasStyleSignal(cssText, root, ["border-radius", "rounded"]) ? "rounded" : "sharp";
  const emphasisLevel = resolveEmphasisLevel(headingScale, dominantWeight, hasSurfaceBackground, hasSurfaceBorder);

  return {
    semanticRole: semanticRoleHint,
    emphasisLevel,
    headingScale,
    dominantWeight,
    bodyWeight,
    hasSurfaceBackground,
    hasSurfaceBorder,
    hasSurfaceShadow,
    cornerStyle,
    colorIntent: inferColorIntent(cssText, root)
  };
}

function inferDominantWeight(cssText: string, root: HTMLElement): number {
  const direct = parseFirstWeight(cssText);
  if (direct) {
    return direct;
  }
  if (root.querySelector("strong,b,h1,h2,h3,h4,h5,h6")) {
    return 600;
  }
  if (root.querySelector("button,[role='button']")) {
    return 500;
  }
  return 400;
}

function inferBodyWeight(cssText: string): number {
  const bodyDirect = parseFirstWeight(cssText.match(/(?:p|span|li|body)[^{]*\{[^}]*font-weight\s*:\s*([^;}]*)/i)?.[1] ?? "");
  if (bodyDirect) {
    return bodyDirect;
  }
  return 400;
}

function parseFirstWeight(value: string): number | undefined {
  const normalized = value.toLowerCase();
  if (normalized.includes("bold")) {
    return 700;
  }
  if (normalized.includes("normal")) {
    return 400;
  }
  const match = normalized.match(/\b([1-9]00)\b/);
  if (!match) {
    return undefined;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hasStyleSignal(cssText: string, root: HTMLElement, keys: string[]): boolean {
  const inlineStyle = root.getAttribute("style") ?? "";
  const className = root.className ?? "";
  const combined = `${cssText}\n${inlineStyle}\n${className}`.toLowerCase();
  return keys.some((key) => combined.includes(key.toLowerCase()));
}

function resolveEmphasisLevel(
  headingScale: number,
  dominantWeight: number,
  hasSurfaceBackground: boolean,
  hasSurfaceBorder: boolean
): "subtle" | "balanced" | "strong" {
  const emphasisScore =
    (headingScale >= 1.25 ? 1 : 0) +
    (dominantWeight >= 600 ? 1 : 0) +
    (hasSurfaceBackground ? 1 : 0) +
    (hasSurfaceBorder ? 1 : 0);
  if (emphasisScore >= 3) {
    return "strong";
  }
  if (emphasisScore <= 1) {
    return "subtle";
  }
  return "balanced";
}

function inferColorIntent(cssText: string, root: HTMLElement): ComponentIntentSummary["colorIntent"] {
  const combined = `${cssText} ${(root.getAttribute("style") ?? "")} ${(root.className ?? "")}`.toLowerCase();
  if (combined.includes("success") || combined.includes("green")) {
    return "positive";
  }
  if (combined.includes("warning") || combined.includes("yellow") || combined.includes("amber")) {
    return "warning";
  }
  if (combined.includes("danger") || combined.includes("error") || combined.includes("red")) {
    return "danger";
  }
  if (combined.includes("accent") || combined.includes("primary") || combined.includes("blue") || combined.includes("purple")) {
    return "accent";
  }
  return "neutral";
}
