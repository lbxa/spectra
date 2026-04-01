import type { NativeExemplarProfile } from "../../lib/adaptation/types";

const EXEMPLAR_SELECTOR = "button, a, input, textarea, select, [role='button']";
const EXEMPLAR_LIMIT = 6;

export function sampleNativeExemplars(scopeRoot: ParentNode = document): NativeExemplarProfile[] {
  const candidates = Array.from(scopeRoot.querySelectorAll(EXEMPLAR_SELECTOR));
  const exemplars: NativeExemplarProfile[] = [];

  for (const candidate of candidates) {
    if (!(candidate instanceof HTMLElement)) {
      continue;
    }
    if (!isElementVisible(candidate)) {
      continue;
    }
    exemplars.push(toExemplarProfile(candidate));
    if (exemplars.length >= EXEMPLAR_LIMIT) {
      break;
    }
  }

  return exemplars;
}

function toExemplarProfile(element: HTMLElement): NativeExemplarProfile {
  const computed = window.getComputedStyle(element);
  return {
    tagName: element.tagName.toLowerCase(),
    className: element.className || "",
    textSnippet: (element.textContent || "").trim().slice(0, 80),
    styles: {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      borderRadiusPx: toPixels(computed.borderRadius),
      fontFamily: computed.fontFamily,
      fontWeight: computed.fontWeight,
      fontSizePx: toPixels(computed.fontSize),
      paddingX: toPixels(computed.paddingLeft) + toPixels(computed.paddingRight),
      paddingY: toPixels(computed.paddingTop) + toPixels(computed.paddingBottom)
    }
  };
}

function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  const computed = window.getComputedStyle(element);
  return computed.visibility !== "hidden" && computed.display !== "none";
}

function toPixels(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.round(parsed * 100) / 100);
}
