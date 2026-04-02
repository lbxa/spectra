import {
  type AdaptComponentResponse,
  type ApplySavedPreviewOnTabResponse,
  isIncomingRuntimeMessage,
  isPreviewStatusMessage,
  type ApplySavedPreviewResponse,
  type ListSavedPreviewsForPageResponse,
  type SaveDerivedComponentResponse,
  type SavePreviewSceneResponse,
  type SaveComponentPayload,
  type SaveComponentResponse
} from "./lib/library/messages";
import { ChromeRuntimeEventPublisher } from "./lib/events/chrome-runtime-event-publisher";
import { LibraryApplicationService } from "./lib/library/application-service";
import { libraryRepository } from "./lib/library/repository";
import { INBOX_COLLECTION_ID, type SavedComponent } from "./lib/library/types";
import { requestAdaptationFromBackend } from "./background/adapt-client";
import { injectCaptureRuntime } from "./background/injector";
import { generateCapturePreview, processComponentThumbnail } from "./background/image-processing";
import {
  handleApplySavedPreview,
  handleApplySavedPreviewOnTab,
  handleListSavedPreviewsForPage,
  handlePreviewStatus,
  handleSavePreviewScene,
  handleStartPreview
} from "./background/message-router";
import {
  clearCaptureTargetCollectionId,
  clearPreviewSession,
  getCaptureTargetCollectionId,
  setCaptureTargetCollectionId
} from "./background/session-store";
import { assertCaptureSupportedTab, requireActiveTab } from "./background/tab-gate";

type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

declare const __DEBUG__: boolean;

type BackgroundServices = {
  repository: typeof libraryRepository;
  libraryApplicationService: LibraryApplicationService;
  requestAdaptationFromBackend: typeof requestAdaptationFromBackend;
  injectCaptureRuntime: typeof injectCaptureRuntime;
  processComponentThumbnail: typeof processComponentThumbnail;
  generateCapturePreview: typeof generateCapturePreview;
  getCaptureTargetCollectionId: typeof getCaptureTargetCollectionId;
  clearCaptureTargetCollectionId: typeof clearCaptureTargetCollectionId;
  setCaptureTargetCollectionId: typeof setCaptureTargetCollectionId;
  requireActiveTab: typeof requireActiveTab;
  assertCaptureSupportedTab: typeof assertCaptureSupportedTab;
  messageRouter: {
    handleStartPreview: typeof handleStartPreview;
    handleSavePreviewScene: typeof handleSavePreviewScene;
    handleListSavedPreviewsForPage: typeof handleListSavedPreviewsForPage;
    handleApplySavedPreview: typeof handleApplySavedPreview;
    handleApplySavedPreviewOnTab: typeof handleApplySavedPreviewOnTab;
    handlePreviewStatus: typeof handlePreviewStatus;
  };
};

const backgroundServices: BackgroundServices = {
  repository: libraryRepository,
  libraryApplicationService: new LibraryApplicationService(
    libraryRepository,
    new ChromeRuntimeEventPublisher()
  ),
  requestAdaptationFromBackend,
  injectCaptureRuntime,
  processComponentThumbnail,
  generateCapturePreview,
  getCaptureTargetCollectionId,
  clearCaptureTargetCollectionId,
  setCaptureTargetCollectionId,
  requireActiveTab,
  assertCaptureSupportedTab,
  messageRouter: {
    handleStartPreview,
    handleSavePreviewScene,
    handleListSavedPreviewsForPage,
    handleApplySavedPreview,
    handleApplySavedPreviewOnTab,
    handlePreviewStatus
  }
};

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || typeof tab.id !== "number") {
    return;
  }

  try {
    await backgroundServices.injectCaptureRuntime(tab.id);
  } catch (error) {
    console.error("Failed to inject content script from action click:", error);
  }
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isIncomingRuntimeMessage(message)) {
    return false;
  }

  if (message.type === "START_CAPTURE") {
    if (!message.activeCollectionId?.trim()) {
      sendResponse({
        ok: false,
        error: "Missing active collection id"
      } satisfies SaveComponentResponse);
      return false;
    }
    injectContentScript(message.activeCollectionId)
      .then(() => sendResponse({ ok: true } satisfies SaveComponentResponse))
      .catch((error: unknown) => {
        console.error("Failed to start capture:", error);
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to start capture"
        } satisfies SaveComponentResponse);
      });
    return true;
  }

  if (message.type === "START_PREVIEW") {
    backgroundServices.messageRouter.handleStartPreview(message)
      .then((response) => sendResponse(response))
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to start preview"
        } satisfies SaveComponentResponse);
      });
    return true;
  }

  if (message.type === "SAVE_PREVIEW_SCENE") {
    backgroundServices.messageRouter.handleSavePreviewScene(message)
      .then((response) => sendResponse(response satisfies SavePreviewSceneResponse))
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to save preview scene"
        } satisfies SavePreviewSceneResponse);
      });
    return true;
  }

  if (message.type === "LIST_SAVED_PREVIEWS_FOR_PAGE") {
    backgroundServices.messageRouter.handleListSavedPreviewsForPage(message)
      .then((response) => sendResponse(response satisfies ListSavedPreviewsForPageResponse))
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          previews: [],
          error: error instanceof Error ? error.message : "Unable to list saved previews"
        } satisfies ListSavedPreviewsForPageResponse);
      });
    return true;
  }

  if (message.type === "APPLY_SAVED_PREVIEW") {
    backgroundServices.messageRouter.handleApplySavedPreview(message)
      .then((response) => sendResponse(response satisfies ApplySavedPreviewResponse))
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to apply saved preview"
        } satisfies ApplySavedPreviewResponse);
      });
    return true;
  }

  if (message.type === "APPLY_SAVED_PREVIEW_ON_TAB") {
    backgroundServices.messageRouter.handleApplySavedPreviewOnTab(message)
      .then((response) => sendResponse(response satisfies ApplySavedPreviewOnTabResponse))
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to apply saved preview on active tab"
        } satisfies ApplySavedPreviewOnTabResponse);
      });
    return true;
  }

  if (message.type === "SAVE_COMPONENT") {
    handleSaveComponent(message.payload, sender, backgroundServices)
      .then((previewDataUrl) =>
        sendResponse({
          ok: true,
          previewDataUrl: previewDataUrl ?? undefined
        } satisfies SaveComponentResponse)
      )
      .catch((error: unknown) => {
        console.error("Failed to save component:", error);
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to save component"
        } satisfies SaveComponentResponse);
      });
    return true;
  }

  if (message.type === "ADAPT_COMPONENT") {
    void logAdaptBackgroundDebug("request_received", {
      requestId: message.payload.requestId ?? "none",
      componentHtmlLength: message.payload.componentPack.normalizedHtml.length,
      componentCssLength: message.payload.componentPack.baseCss.length,
      targetUrl: message.payload.targetSiteContext.metadata.pageUrl
    });
    backgroundServices.requestAdaptationFromBackend(message.payload)
      .then((patch) => {
        void logAdaptBackgroundDebug("request_succeeded", {
          requestId: message.payload.requestId ?? "none",
          summary: patch.summary,
          confidence: patch.confidence,
          warningCount: patch.warnings.length
        });
        sendResponse({
          ok: true,
          patch
        } satisfies AdaptComponentResponse);
      })
      .catch((error: unknown) => {
        void logAdaptBackgroundDebug("request_failed", {
          requestId: message.payload.requestId ?? "none",
          error: error instanceof Error ? error.message : "Unable to adapt component"
        });
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to adapt component"
        } satisfies AdaptComponentResponse);
      });
    return true;
  }

  if (message.type === "SAVE_DERIVED_COMPONENT") {
    handleSaveDerivedComponent(message.payload, backgroundServices)
      .then((component) =>
        sendResponse({
          ok: true,
          component
        } satisfies SaveDerivedComponentResponse)
      )
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to save derived component"
        } satisfies SaveDerivedComponentResponse);
      });
    return true;
  }

  if (isPreviewStatusMessage(message)) {
    backgroundServices.messageRouter.handlePreviewStatus(message, sender).catch((error: unknown) => {
      console.error("Failed to process preview status:", error);
    });
    return false;
  }

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void clearPreviewSession(tabId);
  void clearCaptureTargetCollectionId(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading" || typeof changeInfo.url === "string") {
    void clearPreviewSession(tabId);
    void clearCaptureTargetCollectionId(tabId);
  }
});

async function injectContentScript(activeCollectionId: string): Promise<void> {
  const tab = await backgroundServices.requireActiveTab();
  await backgroundServices.assertCaptureSupportedTab(tab.id!);
  await backgroundServices.setCaptureTargetCollectionId(tab.id!, activeCollectionId);
  await backgroundServices.injectCaptureRuntime(tab.id!);
}

async function handleSaveComponent(
  payload: SaveComponentPayload,
  sender: chrome.runtime.MessageSender,
  services: BackgroundServices
): Promise<string | null> {
  await services.repository.initLibrary();
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
  const thumbnailMeta = await services.processComponentThumbnail(croppedDataUrl);
  const tabId = sender.tab?.id;
  const captureCollectionId =
    typeof tabId === "number" ? await services.getCaptureTargetCollectionId(tabId) : null;
  const targetCollectionId = captureCollectionId ?? INBOX_COLLECTION_ID;

  const record: SavedComponent = {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
    collectionIds: [targetCollectionId],
    url: payload.url,
    title: payload.title,
    capturedAt: new Date().toISOString(),
    html: payload.html,
    cssText: payload.cssText,
    screenshotDataUrl: croppedDataUrl,
    thumbnailMeta: thumbnailMeta ?? undefined,
    sourceHostSignature: payload.sourceHostSignature
  };
  await services.libraryApplicationService.saveComponent(record);
  if (typeof tabId === "number") {
    await services.clearCaptureTargetCollectionId(tabId);
  }
  return services.generateCapturePreview(croppedDataUrl);
}

async function handleSaveDerivedComponent(
  payload: {
  sourceComponentId: string;
  html: string;
  cssText: string;
  summary: string;
  warnings: string[];
  confidence: number;
  themeFingerprint: string;
  },
  services: BackgroundServices = backgroundServices
): Promise<SavedComponent> {
  await services.repository.initLibrary();
  if (!payload?.sourceComponentId) {
    throw new Error("Missing source component id");
  }
  if (typeof payload.html !== "string" || payload.html.length === 0) {
    throw new Error("Missing adapted HTML");
  }
  if (typeof payload.cssText !== "string") {
    throw new Error("Missing adapted CSS");
  }
  const sourceComponent = await services.repository.getComponent(payload.sourceComponentId);
  if (!sourceComponent) {
    throw new Error("Source component not found");
  }

  const next: SavedComponent = {
    ...sourceComponent,
    capturedAt: new Date().toISOString(),
    html: payload.html,
    cssText: payload.cssText,
    title: sourceComponent.title,
    derivedFromComponentId: undefined,
    adaptation: {
      summary: payload.summary,
      warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
      confidence:
        Number.isFinite(payload.confidence) && payload.confidence >= 0 && payload.confidence <= 1
          ? payload.confidence
          : 0,
      themeFingerprint: payload.themeFingerprint,
      adaptedAt: new Date().toISOString()
    }
  };

  return services.libraryApplicationService.saveComponent(next);
}

function validatePayload(payload: SaveComponentPayload): void {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid save payload.");
  }
  if (typeof payload.html !== "string" || payload.html.length === 0) {
    throw new Error("Missing selected HTML.");
  }
  if (typeof payload.cssText !== "string") {
    throw new Error("Missing selected CSS.");
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
  if (!payload.sourceHostSignature || typeof payload.sourceHostSignature !== "object") {
    throw new Error("Missing host signature.");
  }
}

async function logAdaptBackgroundDebug(event: string, payload: Record<string, unknown>): Promise<void> {
  if (!__DEBUG__) {
    return;
  }
  console.info(`[spectra][adapt][background-main][${event}]`, payload);
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

