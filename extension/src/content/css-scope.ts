const GLOBAL_SELECTOR_PATTERN = /(^|,)\s*(html|body|:root)\b/g;

export function scopeCapturedCss(cssText: string, wrapperSelector: string): string {
  if (!cssText.trim()) {
    return "";
  }

  const parsedRules = parseCssRules(cssText);
  return scopeCssRules(parsedRules, wrapperSelector).join("\n");
}

function parseCssRules(cssText: string): CSSRule[] {
  if (typeof CSSStyleSheet !== "undefined") {
    try {
      const constructableSheet = new CSSStyleSheet();
      if ("replaceSync" in constructableSheet) {
        constructableSheet.replaceSync(cssText);
        return Array.from(constructableSheet.cssRules);
      }
    } catch {
      // Fall back to parsing via a temporary style element.
    }
  }

  const parent = document.head ?? document.documentElement;
  if (!parent) {
    return [];
  }

  const style = document.createElement("style");
  style.media = "not all";
  style.textContent = cssText;
  parent.appendChild(style);

  try {
    const rules = style.sheet?.cssRules;
    return rules ? Array.from(rules) : [];
  } finally {
    style.remove();
  }
}

function scopeCssRules(rules: CSSRule[], wrapperSelector: string): string[] {
  const scopedBlocks: string[] = [];

  for (const rule of rules) {
    if (isStyleRule(rule)) {
      const selectors = scopeSelectorList(rule.selectorText, wrapperSelector);
      const body = rule.style.cssText.trim();
      if (selectors.length > 0 && body) {
        scopedBlocks.push(`${selectors.join(", ")} { ${body} }`);
      }
      continue;
    }

    const cssText = rule.cssText.trim();
    if (!cssText) {
      continue;
    }

    if (isKeyframesText(cssText)) {
      scopedBlocks.push(cssText);
      continue;
    }

    if (hasNestedRules(rule)) {
      const scopedNestedRules = scopeCssRules(Array.from(rule.cssRules), wrapperSelector);
      if (scopedNestedRules.length === 0) {
        continue;
      }
      const prelude = extractRulePrelude(cssText);
      if (!prelude) {
        continue;
      }
      scopedBlocks.push(`${prelude} { ${scopedNestedRules.join(" ")} }`);
      continue;
    }

    scopedBlocks.push(cssText);
  }

  return scopedBlocks;
}

function scopeSelectorList(rawSelector: string, wrapperSelector: string): string[] {
  return rawSelector
    .split(",")
    .map((selector) => selector.trim())
    .filter(Boolean)
    .map((selector) => selector.replace(GLOBAL_SELECTOR_PATTERN, "$1"))
    .map((selector) => selector.trim())
    .map((selector) => (selector ? `${wrapperSelector} ${selector}` : wrapperSelector));
}

function hasNestedRules(rule: CSSRule): rule is CSSRule & { cssRules: CSSRuleList } {
  return "cssRules" in rule;
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return "selectorText" in rule && typeof rule.selectorText === "string";
}

function extractRulePrelude(cssText: string): string {
  const openingBraceIndex = cssText.indexOf("{");
  if (openingBraceIndex === -1) {
    return "";
  }
  return cssText.slice(0, openingBraceIndex).trim();
}

function isKeyframesText(cssText: string): boolean {
  return /^@(-[a-z]+-)?keyframes\b/i.test(cssText);
}
