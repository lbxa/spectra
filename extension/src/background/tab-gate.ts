export async function requireActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || typeof tab.id !== "number") {
    throw new Error("No active tab available.");
  }
  return tab;
}

const PREVIEW_UNSUPPORTED_PAGE_ERROR =
  "Preview is unavailable on this page. Open an http(s) page and try again.";

export function assertPreviewEligibleUrl(url: string | undefined): void {
  if (!isPreviewEligibleUrl(url)) {
    throw new Error(PREVIEW_UNSUPPORTED_PAGE_ERROR);
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
  return isCaptureSupportedUrl(url);
}

export function isCaptureSupportedUrl(url: string | undefined): boolean {
  if (typeof url !== "string" || url.length === 0) {
    return false;
  }
  return url.startsWith("http://") || url.startsWith("https://");
}
