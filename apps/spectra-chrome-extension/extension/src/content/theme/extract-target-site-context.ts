import type { TargetSiteContext, ThemeTokenMap } from "../../lib/library/messages";
import { sampleNativeExemplars } from "./sample-native-exemplars";

export function extractTargetSiteContext(host: HTMLElement): TargetSiteContext {
  const computed = window.getComputedStyle(host);

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
    nativeExemplars: sampleNativeExemplars(host),
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
