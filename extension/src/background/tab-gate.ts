export async function requireActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || typeof tab.id !== "number") {
    throw new Error("No active tab available.");
  }
  return tab;
}

export function assertPreviewEligibleUrl(url: string | undefined): void {
  if (!isPreviewEligibleUrl(url)) {
    throw new Error("Preview is only available on localhost and 127.0.0.1 pages.");
  }
}

export async function assertPreviewEligibleTab(tabId: number): Promise<void> {
  let pageUrl: string | undefined;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.location.href
    });
    pageUrl = typeof result?.result === "string" ? result.result : undefined;
  } catch {
    pageUrl = undefined;
  }

  assertPreviewEligibleUrl(pageUrl);
}

export async function assertCaptureSupportedTab(tabId: number): Promise<void> {
  let pageUrl: string | undefined;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.location.href
    });
    pageUrl = typeof result?.result === "string" ? result.result : undefined;
  } catch {
    pageUrl = undefined;
  }

  if (!isCaptureSupportedUrl(pageUrl)) {
    throw new Error("Capture is not available on this page. Open an http(s) webpage and try again.");
  }
}

export function isPreviewEligibleUrl(url: string | undefined): boolean {
  if (typeof url !== "string" || url.length === 0) {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
}

export function isCaptureSupportedUrl(url: string | undefined): boolean {
  if (typeof url !== "string" || url.length === 0) {
    return false;
  }
  return url.startsWith("http://") || url.startsWith("https://");
}
