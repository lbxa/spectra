const GLOBAL_SELECTOR_PATTERN = /(^|,)\s*(html|body|:root)\b/g;

export function scopeCapturedCss(cssText: string, wrapperSelector: string): string {
  if (!cssText.trim()) {
    return "";
  }

  const blocks = cssText.split("}");
  const scopedBlocks: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) {
      continue;
    }
    const separator = trimmed.indexOf("{");
    if (separator <= 0) {
      continue;
    }
    const rawSelector = trimmed.slice(0, separator).trim();
    const body = trimmed.slice(separator + 1).trim();
    if (!body) {
      continue;
    }

    const selectors = rawSelector
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean)
      .map((selector) => selector.replace(GLOBAL_SELECTOR_PATTERN, "$1"))
      .map((selector) => selector.trim())
      .filter(Boolean)
      .map((selector) => `${wrapperSelector} ${selector}`);

    if (selectors.length === 0) {
      continue;
    }

    scopedBlocks.push(`${selectors.join(", ")} { ${body} }`);
  }

  return scopedBlocks.join("\n");
}
