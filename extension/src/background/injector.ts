export async function injectCaptureRuntime(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
    world: "ISOLATED"
  });
}

export async function injectPreviewRuntime(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["preview-runtime.js"],
    world: "ISOLATED"
  });
}
