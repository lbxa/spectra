import type { TargetSiteContext, ThemeTokenSet } from "../../lib/adaptation/types";
import { sampleNativeExemplars } from "./sample-native-exemplars";

const COLOR_SAMPLE_LIMIT = 20;
const FONT_SAMPLE_LIMIT = 8;
const SPACING_SAMPLE_LIMIT = 12;
const RADIUS_SAMPLE_LIMIT = 10;
const SHADOW_SAMPLE_LIMIT = 8;
const TARGET_SITE_MAX_PATCH_CSS_BYTES = 16_000;

type ExtractTargetSiteContextInput = {
  insertionHost: HTMLElement;
  protectedNodeIds: string[];
};

export function extractTargetSiteContext(input: ExtractTargetSiteContextInput): TargetSiteContext {
  const { insertionHost, protectedNodeIds } = input;
  const insertionStyles = window.getComputedStyle(insertionHost);
  const theme = extractThemeTokens();
  const themeFingerprint = buildThemeFingerprint(theme);

  return {
    page: {
      origin: window.location.origin,
      pathname: window.location.pathname,
      title: document.title || ""
    },
    theme,
    insertionZone: {
      tagName: insertionHost.tagName.toLowerCase(),
      display: insertionStyles.display,
      color: insertionStyles.color,
      backgroundColor: insertionStyles.backgroundColor,
      fontFamily: insertionStyles.fontFamily,
      fontSizePx: toPixels(insertionStyles.fontSize),
      lineHeightPx: toPixels(insertionStyles.lineHeight),
      borderRadiusPx: toPixels(insertionStyles.borderRadius)
    },
    nativeExemplars: sampleNativeExemplars(document),
    hardConstraints: {
      maxPatchCssBytes: TARGET_SITE_MAX_PATCH_CSS_BYTES,
      protectedNodeIds,
      forbiddenPatterns: ["<script", "javascript:", "@import", "url(http", "url(https"]
    },
    metadata: {
      extractedAt: new Date().toISOString(),
      themeFingerprint
    }
  };
}

function extractThemeTokens(): ThemeTokenSet {
  const rootStyles = window.getComputedStyle(document.documentElement);
  const bodyStyles = window.getComputedStyle(document.body);
  const colors = uniqueLimited([
    rootStyles.color,
    rootStyles.backgroundColor,
    bodyStyles.color,
    bodyStyles.backgroundColor
  ], COLOR_SAMPLE_LIMIT);
  const fontFamilies = uniqueLimited([rootStyles.fontFamily, bodyStyles.fontFamily], FONT_SAMPLE_LIMIT);
  const spacingPx = uniqueNumericLimited([
    toPixels(rootStyles.getPropertyValue("--spacing")),
    toPixels(rootStyles.marginTop),
    toPixels(rootStyles.marginBottom),
    toPixels(bodyStyles.marginTop),
    toPixels(bodyStyles.marginBottom),
    toPixels(bodyStyles.paddingTop),
    toPixels(bodyStyles.paddingBottom)
  ], SPACING_SAMPLE_LIMIT);
  const radiusPx = uniqueNumericLimited([
    toPixels(rootStyles.getPropertyValue("--radius")),
    toPixels(rootStyles.borderRadius),
    toPixels(bodyStyles.borderRadius)
  ], RADIUS_SAMPLE_LIMIT);
  const shadows = uniqueLimited([rootStyles.boxShadow, bodyStyles.boxShadow], SHADOW_SAMPLE_LIMIT);

  return {
    colors,
    fontFamilies,
    spacingPx,
    radiusPx,
    shadows
  };
}

function uniqueLimited(values: string[], limit: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || normalized === "none" || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

function uniqueNumericLimited(values: number[], limit: number): number[] {
  const result: number[] = [];
  const seen = new Set<number>();
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

function toPixels(value: string): number {
  if (!value || value === "normal") {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.round(parsed * 100) / 100);
}

function buildThemeFingerprint(theme: ThemeTokenSet): string {
  const source = JSON.stringify(theme);
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return `theme_${Math.abs(hash)}`;
}
