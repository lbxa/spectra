import type { InsertionRelation } from "../../lib/library/messages";
import type { AnchorSpec, SavedPreview, SavedPreviewTarget } from "../../lib/library/types";
import type { CandidateContainer } from "../candidate-scan";
import type { OverlayRoot } from "../overlay-root";
import { updateGhostPlacement } from "../ghost-placement";

export function updateCandidatePresentation(
  candidate: CandidateContainer,
  overlay: OverlayRoot,
  relation: InsertionRelation
): void {
  showRect(overlay.hoverOutline, candidate.rect);
  showRect(overlay.selectedOutline, candidate.rect);
  overlay.label.style.display = "block";
  overlay.label.textContent = candidate.element.tagName.toLowerCase();
  overlay.label.style.left = `${Math.max(0, candidate.rect.left)}px`;
  overlay.label.style.top = `${Math.max(0, candidate.rect.top - 24)}px`;
  updateGhostPlacement(overlay.ghost, candidate.rect, relation);
}

export function showRect(layer: HTMLElement, rect: DOMRect): void {
  layer.style.display = "block";
  layer.style.left = `${Math.max(0, rect.left)}px`;
  layer.style.top = `${Math.max(0, rect.top)}px`;
  layer.style.width = `${Math.max(1, rect.width)}px`;
  layer.style.height = `${Math.max(1, rect.height)}px`;
}

export function pickCandidateAt(x: number, y: number, candidates: CandidateContainer[]): CandidateContainer | null {
  const topElement = document.elementFromPoint(x, y);
  if (!(topElement instanceof Element)) {
    return null;
  }
  for (const candidate of candidates) {
    if (candidate.element === topElement || candidate.element.contains(topElement)) {
      return candidate;
    }
  }
  return candidates[0] ?? null;
}

export function buildPreviewTarget(): SavedPreviewTarget {
  const url = new URL(window.location.href);
  return {
    origin: url.origin,
    pathname: normalizePathname(url.pathname),
    matchMode: "exact_path",
    canonicalUrl: window.location.href
  };
}

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, normalized.length - 1)
    : normalized;
}

export function buildAnchorSpec(host: HTMLElement): AnchorSpec {
  const primarySelector = buildElementSelector(host);
  const fallbackSelectors = host.parentElement ? [buildElementSelector(host.parentElement)] : [];
  return {
    strategy: "selector",
    primarySelector,
    fallbackSelectors
  };
}

function buildElementSelector(element: Element): string {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }
  const segments: string[] = [];
  let cursor: Element | null = element;
  while (cursor && cursor.tagName.toLowerCase() !== "html") {
    const cursorElement: Element = cursor;
    const tagName = cursorElement.tagName.toLowerCase();
    const parentElement: HTMLElement | null = cursorElement.parentElement;
    if (!parentElement) {
      segments.unshift(tagName);
      break;
    }
    const siblings = Array.from(parentElement.children).filter(
      (child): child is Element => child instanceof Element && child.tagName === cursorElement.tagName
    );
    const nth = siblings.indexOf(cursorElement) + 1;
    segments.unshift(`${tagName}:nth-of-type(${nth})`);
    cursor = parentElement;
  }
  return segments.join(" > ");
}

export function resolveAnchor(anchor: AnchorSpec): {
  element: HTMLElement | null;
  selector?: string;
  usedFallback: boolean;
} {
  if (anchor.primarySelector) {
    const primaryMatch = document.querySelector(anchor.primarySelector);
    if (primaryMatch instanceof HTMLElement) {
      return {
        element: primaryMatch,
        selector: anchor.primarySelector,
        usedFallback: false
      };
    }
  }

  for (const fallbackSelector of anchor.fallbackSelectors) {
    const fallbackMatch = document.querySelector(fallbackSelector);
    if (fallbackMatch instanceof HTMLElement) {
      return {
        element: fallbackMatch,
        selector: fallbackSelector,
        usedFallback: true
      };
    }
  }

  return {
    element: null,
    usedFallback: false
  };
}

export function buildNormalizedLayout(
  wrapper: HTMLElement,
  referenceViewport: { width: number; height: number }
): SavedPreview["instances"][number]["layout"] {
  const rect = wrapper.getBoundingClientRect();
  return {
    referenceViewport,
    normalizedRect: {
      x: clampUnit(rect.left / referenceViewport.width),
      y: clampUnit(rect.top / referenceViewport.height),
      width: clampUnit(rect.width / referenceViewport.width),
      height: clampUnit(rect.height / referenceViewport.height)
    }
  };
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
