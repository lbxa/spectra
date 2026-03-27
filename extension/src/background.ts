import {
  isIncomingRuntimeMessage,
  type LibraryUpdatedMessage,
  type SaveComponentPayload,
  type SaveComponentResponse
} from "./lib/library/messages";
import { libraryRepository } from "./lib/library/repository";
import { INBOX_COLLECTION_ID, type SavedComponent } from "./lib/library/types";

type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || typeof tab.id !== "number") {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
      world: "ISOLATED"
    });
  } catch (error) {
    console.error("Failed to inject content script from action click:", error);
  }
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isIncomingRuntimeMessage(message)) {
    return false;
  }

  if (message.type === "START_CAPTURE") {
    injectContentScript()
      .then(() => sendResponse({ ok: true } satisfies SaveComponentResponse))
      .catch((error: unknown) => {
        console.error("Failed to start capture:", error);
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to start capture."
        } satisfies SaveComponentResponse);
      });
    return true;
  }

  if (message.type === "SAVE_COMPONENT") {
    handleSaveComponent(message.payload, sender)
      .then(() => sendResponse({ ok: true } satisfies SaveComponentResponse))
      .catch((error: unknown) => {
        console.error("Failed to save component:", error);
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to save component."
        } satisfies SaveComponentResponse);
      });
    return true;
  }

  return false;
});

async function injectContentScript(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || typeof tab.id !== "number") {
    throw new Error("No active tab available.");
  }
  if (!isCaptureSupportedUrl(tab.url)) {
    throw new Error("Capture is not available on this page. Open an http(s) webpage and try again.");
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
    world: "ISOLATED"
  });
}

function isCaptureSupportedUrl(url: string | undefined): boolean {
  if (typeof url !== "string" || url.length === 0) {
    return false;
  }
  return url.startsWith("http://") || url.startsWith("https://");
}

async function handleSaveComponent(
  payload: SaveComponentPayload,
  sender: chrome.runtime.MessageSender
): Promise<void> {
  await libraryRepository.initLibrary();
  validatePayload(payload);

  const windowId = sender?.tab?.windowId;
  const screenshotDataUrl = typeof windowId === "number"
    ? await chrome.tabs.captureVisibleTab(windowId, { format: "png" })
    : await chrome.tabs.captureVisibleTab({ format: "png" });
  const croppedDataUrl = await cropScreenshotToBounds(
    screenshotDataUrl,
    payload.bounds,
    payload.devicePixelRatio
  );

  const record: SavedComponent = {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
    collectionIds: [INBOX_COLLECTION_ID],
    url: payload.url,
    title: payload.title,
    capturedAt: new Date().toISOString(),
    html: payload.html,
    screenshotDataUrl: croppedDataUrl
  };
  const savedComponent = await libraryRepository.saveComponent(record);
  await notifyLibraryUpdated({
    type: "LIBRARY_UPDATED",
    payload: {
      event: "COMPONENT_SAVED",
      component: savedComponent,
      collectionId: savedComponent.collectionIds[0]
    }
  });
}

function validatePayload(payload: SaveComponentPayload): void {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid save payload.");
  }
  if (typeof payload.html !== "string" || payload.html.length === 0) {
    throw new Error("Missing selected HTML.");
  }
  if (typeof payload.url !== "string" || payload.url.length === 0) {
    throw new Error("Missing page URL.");
  }
  if (typeof payload.title !== "string") {
    throw new Error("Missing page title.");
  }
  if (!payload.bounds || typeof payload.bounds !== "object") {
    throw new Error("Missing element bounds.");
  }

  const { left, top, width, height } = payload.bounds;
  for (const value of [left, top, width, height]) {
    if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new Error("Invalid element bounds.");
    }
  }
  if (width <= 0 || height <= 0) {
    throw new Error("Selected element is not visible.");
  }

  if (
    typeof payload.devicePixelRatio !== "number" ||
    Number.isNaN(payload.devicePixelRatio) ||
    payload.devicePixelRatio <= 0
  ) {
    throw new Error("Invalid device pixel ratio.");
  }
}

async function cropScreenshotToBounds(
  sourceDataUrl: string,
  bounds: Bounds,
  devicePixelRatio: number
): Promise<string> {
  const response = await fetch(sourceDataUrl);
  const imageBlob = await response.blob();
  const bitmap = await createImageBitmap(imageBlob);

  const sourceX = Math.max(0, Math.floor(bounds.left * devicePixelRatio));
  const sourceY = Math.max(0, Math.floor(bounds.top * devicePixelRatio));
  const requestedWidth = Math.max(1, Math.floor(bounds.width * devicePixelRatio));
  const requestedHeight = Math.max(1, Math.floor(bounds.height * devicePixelRatio));

  const cropWidth = Math.min(requestedWidth, bitmap.width - sourceX);
  const cropHeight = Math.min(requestedHeight, bitmap.height - sourceY);

  if (cropWidth <= 0 || cropHeight <= 0) {
    bitmap.close();
    throw new Error("Selected bounds are outside the visible viewport.");
  }

  const canvas = new OffscreenCanvas(cropWidth, cropHeight);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Unable to initialize screenshot canvas.");
  }

  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );
  bitmap.close();

  const croppedBlob = await canvas.convertToBlob({ type: "image/png" });
  return blobToDataUrl(croppedBlob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to convert screenshot to data URL."));
    reader.onloadend = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Screenshot conversion produced invalid data."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

async function notifyLibraryUpdated(message: LibraryUpdatedMessage): Promise<void> {
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    // Ignore when no extension views are listening.
  }
}
