import type {
  HostSceneSummary,
  NativeExemplarStyle,
  TargetSiteContext,
  ThemeTokenMap
} from "../../lib/library/messages";
import { sampleNativeExemplars } from "./sample-native-exemplars";

export function extractTargetSiteContext(host: HTMLElement): TargetSiteContext {
  const computed = window.getComputedStyle(host);
  const nativeExemplars = sampleNativeExemplars(host);

  return {
    globalThemeTokens: extractGlobalThemeTokens(),
    insertionContext: {
      hostTag: host.tagName.toLowerCase(),
      hostClasses: Array.from(host.classList).slice(0, 12),
      nearbyHeading: extractNearbyHeading(host),
      computedDisplay: computed.display,
      computedColor: computed.color,
      computedBackgroundColor: computed.backgroundColor
    },
    nativeExemplars,
    hostSceneSummary: buildHostSceneSummary(host, computed, nativeExemplars),
    hardConstraints: {
      maxOverrideCssChars: 6000,
      protectedNodeIds: []
    },
    metadata: {
      pageUrl: window.location.href,
      pageTitle: document.title ?? "",
      themeFingerprint: computeThemeFingerprint()
    }
  };
}

function extractGlobalThemeTokens(): ThemeTokenMap {
  const rootStyle = window.getComputedStyle(document.documentElement);
  const entries: ThemeTokenMap = {};
  for (let index = 0; index < rootStyle.length; index += 1) {
    const name = rootStyle.item(index);
    if (!name.startsWith("--")) {
      continue;
    }
    const value = rootStyle.getPropertyValue(name).trim();
    if (!value) {
      continue;
    }
    entries[name] = value;
    if (Object.keys(entries).length >= 80) {
      break;
    }
  }
  return entries;
}

function extractNearbyHeading(host: HTMLElement): string | undefined {
  const scoped = host.querySelector("h1,h2,h3,h4,h5,h6");
  if (scoped?.textContent) {
    return scoped.textContent.trim().slice(0, 120);
  }
  const section = host.closest("section,article,main");
  const heading = section?.querySelector("h1,h2,h3,h4,h5,h6");
  return heading?.textContent?.trim().slice(0, 120) || undefined;
}

function computeThemeFingerprint(): string {
  const body = window.getComputedStyle(document.body);
  const root = window.getComputedStyle(document.documentElement);
  return [
    root.getPropertyValue("--color-primary").trim(),
    root.getPropertyValue("--background").trim(),
    body.fontFamily,
    body.color,
    body.backgroundColor
  ]
    .filter(Boolean)
    .join("|")
    .slice(0, 256);
}

function buildHostSceneSummary(
  host: HTMLElement,
  hostStyle: CSSStyleDeclaration,
  nativeExemplars: NativeExemplarStyle[]
): HostSceneSummary {
  const exemplarProfiles = nativeExemplars.map((exemplar) => ({
    role: exemplar.role,
    styles: parseCompactStyleProfile(exemplar.cssText)
  }));
  const textProfile = exemplarProfiles.find((item) => item.role === "text")?.styles;
  const headingProfile = exemplarProfiles.find((item) => item.role === "heading")?.styles;
  const containerProfile = exemplarProfiles.find((item) => item.role === "container")?.styles;

  const bodyFontSizePx = parsePx(textProfile?.["font-size"]);
  const headingFontSizePx = parsePx(headingProfile?.["font-size"]);
  const headingScale =
    bodyFontSizePx && headingFontSizePx && bodyFontSizePx > 0 ? clamp(headingFontSizePx / bodyFontSizePx, 1, 2.5) : 1;

  const weightCandidates = exemplarProfiles
    .map((item) => parseFontWeight(item.styles["font-weight"]))
    .filter((weight): weight is number => weight !== undefined);
  const commonFontWeights = Array.from(new Set(weightCandidates)).sort((left, right) => left - right);

  const colorCandidates = exemplarProfiles
    .map((item) => item.styles.color)
    .filter((color): color is string => Boolean(color && color.length > 0));
  const textPrimary = textProfile?.color || hostStyle.color || undefined;
  const textMuted = colorCandidates.find((color) => color !== textPrimary);
  const surfaceBase = containerProfile?.["background-color"] || hostStyle.backgroundColor || undefined;
  const surfaceMuted = exemplarProfiles
    .map((item) => item.styles["background-color"])
    .find((color) => color && color !== surfaceBase);
  const borderSubtle = containerProfile?.["border-color"] || undefined;
  const accent = resolveAccentColor(host) || undefined;

  const spacingPx = parseFirstPx(containerProfile?.padding) ?? parseFirstPx(hostStyle.padding);
  return {
    typography: {
      bodyFontFamily: textProfile?.["font-family"] || hostStyle.fontFamily || undefined,
      bodyFontSizePx,
      bodyLineHeightPx: parseLineHeightPx(textProfile?.["line-height"], bodyFontSizePx),
      headingScale,
      commonFontWeights
    },
    colors: {
      textPrimary,
      textMuted,
      surfaceBase,
      surfaceMuted,
      borderSubtle,
      accent
    },
    surface: {
      borderRadiusPx: parseFirstPx(containerProfile?.["border-radius"]) ?? parseFirstPx(hostStyle.borderRadius),
      hasShadow: hasShadow(containerProfile?.["box-shadow"]) || hasShadow(hostStyle.boxShadow)
    },
    density: {
      spacingPx,
      compactness: resolveCompactness(spacingPx)
    }
  };
}

function parseCompactStyleProfile(cssText: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const declaration of cssText.split(";")) {
    const separatorIndex = declaration.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }
    const name = declaration.slice(0, separatorIndex).trim();
    const value = declaration.slice(separatorIndex + 1).trim();
    if (!name || !value) {
      continue;
    }
    values[name] = value;
  }
  return values;
}

function parsePx(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return undefined;
  }
  const numeric = Number.parseFloat(match[0]);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function parseFirstPx(value: string | undefined): number | undefined {
  return parsePx(value?.split(/\s+/)[0]);
}

function parseLineHeightPx(lineHeight: string | undefined, fallbackSizePx: number | undefined): number | undefined {
  if (!lineHeight) {
    return undefined;
  }
  if (lineHeight === "normal") {
    return fallbackSizePx ? Number((fallbackSizePx * 1.4).toFixed(2)) : undefined;
  }
  const parsed = parsePx(lineHeight);
  if (!parsed) {
    return fallbackSizePx ? Number((fallbackSizePx * 1.4).toFixed(2)) : undefined;
  }
  if (lineHeight.endsWith("px")) {
    return parsed;
  }
  return fallbackSizePx ? Number((parsed * fallbackSizePx).toFixed(2)) : parsed;
}

function parseFontWeight(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  if (value === "normal") {
    return 400;
  }
  if (value === "bold") {
    return 700;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

function resolveAccentColor(host: HTMLElement): string | undefined {
  const root = window.getComputedStyle(document.documentElement);
  const tokens = ["--color-primary", "--accent", "--primary", "--brand"];
  for (const token of tokens) {
    const value = root.getPropertyValue(token).trim();
    if (value) {
      return value;
    }
  }
  const link = host.querySelector<HTMLElement>("a");
  if (!link) {
    return undefined;
  }
  const linkColor = window.getComputedStyle(link).color;
  return linkColor || undefined;
}

function hasShadow(value: string | undefined): boolean {
  return Boolean(value && value !== "none");
}

function resolveCompactness(spacingPx: number | undefined): "compact" | "balanced" | "spacious" {
  if (!spacingPx || spacingPx <= 8) {
    return "compact";
  }
  if (spacingPx <= 16) {
    return "balanced";
  }
  return "spacious";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number(value.toFixed(3))));
}
