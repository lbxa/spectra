import {
  collectMatchedScopedCssText,
  createCaptureScopeSelector,
  markScopedCss,
  rewriteAssetUrls,
  sanitizeClonedTree
} from "../capture-snapshot";
import { shouldDropStyleValue, shouldInlineStyleTag, shouldKeepCssProperty } from "./style-policy";

export function buildStandaloneSnapshot(target: Element): { html: string; cssText: string } {
  const clonedRoot = target.cloneNode(true);
  if (!(clonedRoot instanceof Element)) {
    throw new Error("Unable to clone selected element");
  }

  const captureScopeId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `capture_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
  const captureScopeSelector = createCaptureScopeSelector(captureScopeId);
  clonedRoot.setAttribute("data-spectra-capture-root", captureScopeId);

  const originalElements = collectElementTree(target);
  const clonedElements = collectElementTree(clonedRoot);
  const pairCount = Math.min(originalElements.length, clonedElements.length);

  for (let index = 0; index < pairCount; index += 1) {
    inlineComputedStyles(originalElements[index], clonedElements[index]);
  }

  sanitizeClonedTree(clonedRoot);
  rewriteAssetUrls(clonedRoot, document.baseURI);

  const matchedScopedCssText = collectMatchedScopedCssText(target, captureScopeSelector);
  const scopedCssText = markScopedCss(matchedScopedCssText);
  const html = clonedRoot.outerHTML;
  return {
    html,
    cssText: scopedCssText
  };
}

function collectElementTree(root: Element): Element[] {
  const elements: Element[] = [root];
  elements.push(...Array.from(root.querySelectorAll("*")));
  return elements;
}

function inlineComputedStyles(originalElement: Element, clonedElement: Element): void {
  if (!(clonedElement instanceof HTMLElement) && !(clonedElement instanceof SVGElement)) {
    return;
  }
  if (!shouldInlineStyleTag(originalElement.tagName)) {
    return;
  }

  const computedStyle = window.getComputedStyle(originalElement);
  for (let index = 0; index < computedStyle.length; index += 1) {
    const propertyName = computedStyle.item(index);
    if (!propertyName || !shouldKeepCssProperty(propertyName)) {
      continue;
    }
    const value = computedStyle.getPropertyValue(propertyName);
    if (!value || shouldDropStyleValue(propertyName, value)) {
      continue;
    }
    const priority = computedStyle.getPropertyPriority(propertyName);
    clonedElement.style.setProperty(propertyName, value, priority);
  }
}
