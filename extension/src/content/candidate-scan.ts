import { computeHostSignature } from "../lib/preview/host-signature";
import type { HostSignature } from "../lib/library/types";

export type CandidateContainer = {
  element: HTMLElement;
  rect: DOMRect;
  signature: HostSignature;
};

const LAYOUT_TAGS = new Set(["main", "section", "article", "aside", "nav", "form", "div"]);
const BLOCKED_TAGS = new Set(["script", "style", "meta", "link", "noscript"]);

export function scanCandidateContainers(): CandidateContainer[] {
  const results: CandidateContainer[] = [];
  const elements = Array.from(document.body.querySelectorAll<HTMLElement>("*"));

  for (const element of elements) {
    if (!isCandidate(element)) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    results.push({
      element,
      rect,
      signature: computeHostSignature(element)
    });
  }

  return results;
}

function isCandidate(element: HTMLElement): boolean {
  if (element.closest("#spectra-root")) {
    return false;
  }
  if (element.dataset.spectraPreviewId) {
    return false;
  }
  const tag = element.tagName.toLowerCase();
  if (BLOCKED_TAGS.has(tag) || !LAYOUT_TAGS.has(tag)) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width < 80 || rect.height < 40) {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  if (style.position === "fixed") {
    return false;
  }
  if (element.childElementCount === 0 && tag === "div") {
    return false;
  }
  return true;
}
