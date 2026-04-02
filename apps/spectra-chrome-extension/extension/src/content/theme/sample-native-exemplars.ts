import type { NativeExemplarStyle } from "../../lib/library/messages";

const EXEMPLAR_SELECTORS: Array<{ role: string; selector: string }> = [
  { role: "button", selector: "button, [role='button'], input[type='button'], input[type='submit']" },
  { role: "heading", selector: "h1, h2, h3" },
  { role: "text", selector: "p, span, li, a" },
  { role: "field", selector: "input, textarea, select" },
  { role: "container", selector: "section, article, main, aside, nav, div" }
];

export function sampleNativeExemplars(root: HTMLElement): NativeExemplarStyle[] {
  const results: NativeExemplarStyle[] = [];

  for (const exemplar of EXEMPLAR_SELECTORS) {
    const element = root.querySelector<HTMLElement>(exemplar.selector) ?? document.querySelector<HTMLElement>(exemplar.selector);
    if (!element) {
      continue;
    }
    results.push({
      role: exemplar.role,
      cssText: buildCompactStyleProfile(element)
    });
  }

  return results.slice(0, 6);
}

function buildCompactStyleProfile(element: HTMLElement): string {
  const style = window.getComputedStyle(element);
  const entries = [
    ["display", style.display],
    ["font-family", style.fontFamily],
    ["font-size", style.fontSize],
    ["font-weight", style.fontWeight],
    ["line-height", style.lineHeight],
    ["color", style.color],
    ["background-color", style.backgroundColor],
    ["border-radius", style.borderRadius],
    ["padding", style.padding],
    ["gap", style.gap],
    ["box-shadow", style.boxShadow]
  ];

  return entries
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([name, value]) => `${name}:${value};`)
    .join("");
}
