function collectElementTree(root: Element): Element[] {
  const elements: Element[] = [root];
  elements.push(...Array.from(root.querySelectorAll("*")));
  return elements;
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
      if (attributeName.startsWith("data-")) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (attributeName === "class") {
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
