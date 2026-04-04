function collectElementTree(root: Element): Element[] {
  const elements: Element[] = [root];
  elements.push(...Array.from(root.querySelectorAll("*")));
  return elements;
}

const GLOBAL_SELECTOR_PATTERN = /(^|,)\s*(html|body|:root)\b/g;
const SCOPED_CSS_MARKER = "/*__spectra_scoped_css_v1__*/";

export function createCaptureScopeSelector(scopeId: string): string {
  return `[data-spectra-capture-root="${scopeId}"]`;
}

export function markScopedCss(cssText: string): string {
  const trimmed = cssText.trim();
  if (!trimmed) {
    return "";
  }
  return `${SCOPED_CSS_MARKER}\n${trimmed}`;
}

export function unwrapScopedCss(cssText: string): { isScoped: boolean; cssText: string } {
  const trimmed = cssText.trim();
  if (!trimmed.startsWith(SCOPED_CSS_MARKER)) {
    return { isScoped: false, cssText };
  }
  return {
    isScoped: true,
    cssText: trimmed.slice(SCOPED_CSS_MARKER.length).trim()
  };
}

export function collectMatchedScopedCssText(target: Element, scopeSelector: string): string {
  const targetElements = collectElementTree(target);
  const referencedKeyframes = new Set<string>();
  const availableKeyframes = new Map<string, string>();
  const scopedBlocks: string[] = [];

  for (const styleSheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = styleSheet.cssRules;
    } catch {
      continue;
    }
    scopedBlocks.push(
      ...collectMatchedRulesFromList(
        Array.from(rules),
        targetElements,
        scopeSelector,
        referencedKeyframes,
        availableKeyframes
      )
    );
  }

  for (const keyframeName of referencedKeyframes) {
    const keyframeCss = availableKeyframes.get(keyframeName);
    if (keyframeCss) {
      scopedBlocks.push(keyframeCss);
    }
  }

  return scopedBlocks.join("\n");
}

export function sanitizeClonedTree(root: Element): void {
  for (const scriptElement of Array.from(root.querySelectorAll("script"))) {
    scriptElement.remove();
  }

  const elements = collectElementTree(root);
  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim();
      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (attributeName === "style" && attributeValue.length === 0) {
        element.removeAttribute(attribute.name);
      }
    }
  }
}

function rewriteAttributeToAbsoluteUrl(element: Element, attributeName: string, baseUrl: string): void {
  if (!element.hasAttribute(attributeName)) {
    return;
  }

  const rawValue = element.getAttribute(attributeName);
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return;
  }

  const absoluteValue = toAbsoluteUrl(rawValue, baseUrl);
  if (absoluteValue) {
    element.setAttribute(attributeName, absoluteValue);
  }
}

function rewriteSrcSetToAbsoluteUrls(element: Element, attributeName: string, baseUrl: string): void {
  if (!element.hasAttribute(attributeName)) {
    return;
  }

  const rawValue = element.getAttribute(attributeName);
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return;
  }

  const rewrittenValue = rawValue
    .split(",")
    .map((candidate) => {
      const trimmedCandidate = candidate.trim();
      if (!trimmedCandidate) {
        return "";
      }
      const firstSpaceIndex = trimmedCandidate.search(/\s/);
      if (firstSpaceIndex === -1) {
        return toAbsoluteUrl(trimmedCandidate, baseUrl) || trimmedCandidate;
      }
      const urlPart = trimmedCandidate.slice(0, firstSpaceIndex);
      const descriptorPart = trimmedCandidate.slice(firstSpaceIndex).trim();
      const absoluteUrl = toAbsoluteUrl(urlPart, baseUrl) || urlPart;
      return descriptorPart ? `${absoluteUrl} ${descriptorPart}` : absoluteUrl;
    })
    .filter((candidate) => candidate.length > 0)
    .join(", ");

  if (rewrittenValue) {
    element.setAttribute(attributeName, rewrittenValue);
  }
}

export function rewriteAssetUrls(root: Element, baseUrl: string): void {
  for (const element of collectElementTree(root)) {
    rewriteAttributeToAbsoluteUrl(element, "src", baseUrl);
    rewriteAttributeToAbsoluteUrl(element, "href", baseUrl);
    rewriteAttributeToAbsoluteUrl(element, "poster", baseUrl);
    rewriteSrcSetToAbsoluteUrls(element, "srcset", baseUrl);
  }
}

export function toAbsoluteUrl(value: string, baseUrl: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue.startsWith("#")) {
    return null;
  }

  try {
    return new URL(trimmedValue, baseUrl).toString();
  } catch {
    return null;
  }
}

function collectMatchedRulesFromList(
  rules: CSSRule[],
  targetElements: Element[],
  scopeSelector: string,
  referencedKeyframes: Set<string>,
  availableKeyframes: Map<string, string>
): string[] {
  const scopedBlocks: string[] = [];
  for (const rule of rules) {
    const cssText = rule.cssText.trim();
    if (!cssText) {
      continue;
    }

    if (isKeyframesText(cssText)) {
      const keyframeName = extractKeyframeName(cssText);
      if (keyframeName) {
        availableKeyframes.set(keyframeName, cssText);
      }
      continue;
    }

    if (isStyleRule(rule)) {
      const scopedSelectors = buildScopedSelectors(rule.selectorText, targetElements, scopeSelector, rule.style);
      if (scopedSelectors.length === 0) {
        continue;
      }
      const body = rule.style.cssText.trim();
      if (!body) {
        continue;
      }
      collectAnimationReferences(rule.style, referencedKeyframes);
      scopedBlocks.push(`${scopedSelectors.join(", ")} { ${body} }`);
      continue;
    }

    if (!hasNestedRules(rule)) {
      continue;
    }

    const nestedBlocks = collectMatchedRulesFromList(
      Array.from(rule.cssRules),
      targetElements,
      scopeSelector,
      referencedKeyframes,
      availableKeyframes
    );
    if (nestedBlocks.length === 0) {
      continue;
    }
    const prelude = extractRulePrelude(cssText);
    if (!prelude) {
      continue;
    }
    scopedBlocks.push(`${prelude} { ${nestedBlocks.join(" ")} }`);
  }
  return scopedBlocks;
}

function buildScopedSelectors(
  selectorText: string,
  targetElements: Element[],
  scopeSelector: string,
  style: CSSStyleDeclaration
): string[] {
  const scopedSelectors: string[] = [];
  const seenSelectors = new Set<string>();
  for (const rawSelector of selectorText.split(",")) {
    const selector = rawSelector.trim();
    if (!selector) {
      continue;
    }
    const cleanedSelector = selector.replace(GLOBAL_SELECTOR_PATTERN, "$1").trim();
    const matchesTarget = doesSelectorMatchAnyElement(cleanedSelector || selector, targetElements);
    const isScopedGlobalToken = isGlobalSelector(selector) && hasCustomPropertyDeclaration(style);
    if (!matchesTarget && !isScopedGlobalToken) {
      continue;
    }
    const scopedSelector = cleanedSelector ? `${scopeSelector} ${cleanedSelector}` : scopeSelector;
    if (seenSelectors.has(scopedSelector)) {
      continue;
    }
    seenSelectors.add(scopedSelector);
    scopedSelectors.push(scopedSelector);
  }
  return scopedSelectors;
}

function doesSelectorMatchAnyElement(selector: string, targetElements: Element[]): boolean {
  if (!selector) {
    return false;
  }
  const normalizedSelector = stripPseudoElements(selector);
  if (!normalizedSelector) {
    return false;
  }
  for (const element of targetElements) {
    try {
      if (element.matches(normalizedSelector)) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

function stripPseudoElements(selector: string): string {
  return selector.replace(/::[a-zA-Z0-9-]+(?:\([^)]*\))?/g, "").trim();
}

function isGlobalSelector(selector: string): boolean {
  const normalized = selector.trim().toLowerCase();
  return normalized === "html" || normalized === "body" || normalized === ":root";
}

function hasCustomPropertyDeclaration(style: CSSStyleDeclaration): boolean {
  for (let index = 0; index < style.length; index += 1) {
    const name = style.item(index);
    if (name.startsWith("--")) {
      return true;
    }
  }
  return false;
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

function extractKeyframeName(cssText: string): string {
  const match = cssText.match(/^@(?:-[a-z]+-)?keyframes\s+([^{\s]+)/i);
  return match?.[1]?.trim() ?? "";
}

function collectAnimationReferences(style: CSSStyleDeclaration, referencedKeyframes: Set<string>): void {
  const animationName = style.getPropertyValue("animation-name");
  if (animationName) {
    for (const name of animationName.split(",")) {
      const normalized = name.trim();
      if (normalized && normalized !== "none") {
        referencedKeyframes.add(normalized);
      }
    }
  }
}
