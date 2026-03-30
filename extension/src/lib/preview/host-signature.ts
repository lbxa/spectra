import type { HostSignature } from "../library/types";

const LANDMARK_TAGS = new Set(["header", "main", "section", "article", "aside", "nav", "footer", "form"]);

export function createUnknownHostSignature(): HostSignature {
  return {
    landmark: "unknown",
    hostTag: "div",
    layoutMode: "unknown",
    widthBucket: "md",
    depth: 0,
    siblingCount: 0,
    ancestorTags: []
  };
}

export function computeHostSignature(element: Element): HostSignature {
  const hostTag = element.tagName.toLowerCase();
  const computed = window.getComputedStyle(element);
  const display = computed.display;
  const layoutMode = resolveLayoutMode(display, computed.flexDirection);
  const rect = element.getBoundingClientRect();
  const landmark = resolveLandmark(element, hostTag);
  const siblingTagCounts = countSiblingTags(element);
  const repeatedSiblingTag = Object.entries(siblingTagCounts).find(([, count]) => count > 1)?.[0];

  return {
    landmark,
    hostTag,
    layoutMode,
    widthBucket: resolveWidthBucket(rect.width),
    depth: resolveDepth(element),
    siblingCount: element.parentElement?.children.length ?? 0,
    repeatedSiblingTag,
    ancestorTags: getAncestorTags(element),
    nearbyHeading: resolveNearbyHeading(element)
  };
}

export function computeSignatureSimilarity(source: HostSignature, target: HostSignature): number {
  let score = 0;
  if (source.landmark === target.landmark) {
    score += 0.3;
  }
  if (source.layoutMode === target.layoutMode) {
    score += 0.25;
  }
  if (source.widthBucket === target.widthBucket) {
    score += 0.2;
  }
  score += ancestorSimilarity(source.ancestorTags, target.ancestorTags) * 0.15;
  score += headingSimilarity(source.nearbyHeading, target.nearbyHeading) * 0.1;
  return Math.max(0, Math.min(1, score));
}

function resolveLandmark(element: Element, hostTag: string): HostSignature["landmark"] {
  if (LANDMARK_TAGS.has(hostTag)) {
    return hostTag as HostSignature["landmark"];
  }
  if (hostTag === "div") {
    const role = element.getAttribute("role");
    if (role === "main") {
      return "main";
    }
    if (role === "navigation") {
      return "nav";
    }
  }
  const className = element.className.toLowerCase?.() ?? "";
  if (className.includes("hero")) {
    return "hero";
  }
  return "unknown";
}

function resolveLayoutMode(display: string, flexDirection: string): HostSignature["layoutMode"] {
  if (display === "grid" || display === "inline-grid") {
    return "grid";
  }
  if (display === "inline") {
    return "inline";
  }
  if (display === "flex" || display === "inline-flex") {
    return flexDirection.startsWith("column") ? "flex-column" : "flex-row";
  }
  if (display === "block" || display === "flow-root" || display === "list-item") {
    return "block";
  }
  return "unknown";
}

function resolveWidthBucket(width: number): HostSignature["widthBucket"] {
  if (width < 320) return "xs";
  if (width < 640) return "sm";
  if (width < 960) return "md";
  if (width < 1280) return "lg";
  return "xl";
}

function resolveDepth(element: Element): number {
  let depth = 0;
  let current = element.parentElement;
  while (current) {
    depth += 1;
    current = current.parentElement;
  }
  return depth;
}

function getAncestorTags(element: Element): string[] {
  const tags: string[] = [];
  let current = element.parentElement;
  while (current && tags.length < 6) {
    tags.push(current.tagName.toLowerCase());
    current = current.parentElement;
  }
  return tags;
}

function resolveNearbyHeading(element: Element): string | undefined {
  const scopedHeading = element.querySelector("h1,h2,h3,h4,h5,h6");
  if (scopedHeading && scopedHeading.textContent) {
    return scopedHeading.textContent.trim().slice(0, 80);
  }
  const closestSection = element.closest("section,article,main");
  if (!closestSection) {
    return undefined;
  }
  const heading = closestSection.querySelector("h1,h2,h3,h4,h5,h6");
  return heading?.textContent?.trim().slice(0, 80) || undefined;
}

function countSiblingTags(element: Element): Record<string, number> {
  const counts: Record<string, number> = {};
  const siblings = Array.from(element.parentElement?.children ?? []);
  for (const sibling of siblings) {
    const tag = sibling.tagName.toLowerCase();
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return counts;
}

function ancestorSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }
  const rightSet = new Set(right);
  const shared = left.filter((item) => rightSet.has(item)).length;
  return shared / Math.max(left.length, right.length);
}

function headingSimilarity(left?: string, right?: string): number {
  if (!left || !right) {
    return 0;
  }
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}
