import type {
  ApplySavedPreviewOnTabMessage,
  ApplySavedPreviewOnTabResponse,
  ApplySavedPreviewMessage,
  ApplySavedPreviewResponse,
  BeginTargetingMessage,
  ListSavedPreviewsForPageMessage,
  ListSavedPreviewsForPageResponse,
  PreviewStatusMessage,
  RequestAdaptationPatchMessage,
  RequestAdaptationPatchResponse,
  SaveAdaptedComponentRevisionMessage,
  SaveAdaptedComponentRevisionResponse,
  SavePreviewSceneMessage,
  SavePreviewSceneResponse,
  SaveComponentResponse,
  StartPreviewMessage
} from "../lib/library/messages";
import { libraryRepository } from "../lib/library/repository";
import { requestAdaptationPatch } from "./adaptation/client";
import { injectPreviewRuntime } from "./injector";
import { assertPreviewEligibleTab, requireActiveTab } from "./tab-gate";
import { setPreviewSession, updatePreviewSession } from "./session-store";
import { createAdaptedComponentSnapshot } from "../lib/library/revisions";
import { LibraryApplicationService } from "../lib/library/application-service";
import { ChromeRuntimeEventPublisher } from "../lib/events/chrome-runtime-event-publisher";

const libraryApplicationService = new LibraryApplicationService(
  libraryRepository,
  new ChromeRuntimeEventPublisher()
);

export async function handleStartPreview(message: StartPreviewMessage): Promise<SaveComponentResponse> {
  if (!message.component?.id) {
    return { ok: false, error: "Missing component payload" };
  }
  if (typeof message.activeCollectionId !== "string" || message.activeCollectionId.trim().length === 0) {
    return { ok: false, error: "Missing active collection id" };
  }

  try {
    const tab = await requireActiveTab();
    await assertPreviewEligibleTab(tab.id!);

    await setPreviewSession({
      tabId: tab.id!,
      componentId: message.component.id,
      activeCollectionId: message.activeCollectionId,
      status: "starting",
      updatedAt: new Date().toISOString()
    });

    await injectPreviewRuntime(tab.id!);
    await chrome.tabs.sendMessage(
      tab.id!,
      {
        type: "BEGIN_TARGETING",
        component: message.component
      } satisfies BeginTargetingMessage
    );

    await updatePreviewSession(tab.id!, { status: "active" });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not start preview"
    };
  }
}

export async function handlePreviewStatus(
  message: PreviewStatusMessage,
  sender: chrome.runtime.MessageSender
): Promise<void> {
  const tabId = sender.tab?.id;
  if (typeof tabId !== "number") {
    return;
  }

  if (message.type === "PREVIEW_READY") {
    await updatePreviewSession(tabId, { status: "active" });
  } else if (message.type === "PREVIEW_INSERTED") {
    await updatePreviewSession(tabId, {
      status: "active",
      lastPreviewId: message.previewId,
      lastRelation: message.relation,
      lastErrorCode: undefined
    });
  } else if (message.type === "PREVIEW_REMOVED") {
    await updatePreviewSession(tabId, {
      status: "closed",
      lastPreviewId: message.previewId
    });
  } else if (message.type === "PREVIEW_ERROR") {
    await updatePreviewSession(tabId, {
      status: "error",
      lastErrorCode: message.code
    });
  }

  await notifyRuntimeListeners(message);
}

export async function handleSavePreviewScene(
  message: SavePreviewSceneMessage
): Promise<SavePreviewSceneResponse> {
  try {
    await libraryRepository.initLibrary();
    const preview = await libraryRepository.saveSavedPreview(message.payload);
    return { ok: true, preview };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save preview scene"
    };
  }
}

export async function handleListSavedPreviewsForPage(
  message: ListSavedPreviewsForPageMessage
): Promise<ListSavedPreviewsForPageResponse> {
  try {
    await libraryRepository.initLibrary();
    const previews = await libraryRepository.listSavedPreviewsForPage(message.payload);
    return {
      ok: true,
      previews
    };
  } catch (error) {
    return {
      ok: false,
      previews: [],
      error: error instanceof Error ? error.message : "Could not list saved previews"
    };
  }
}

export async function handleApplySavedPreview(
  message: ApplySavedPreviewMessage
): Promise<ApplySavedPreviewResponse> {
  try {
    await libraryRepository.initLibrary();
    const preview = await libraryRepository.getSavedPreview(message.payload.previewId);
    if (!preview || preview.status !== "active") {
      return { ok: false, error: "Saved preview not found" };
    }
    return {
      ok: true,
      preview,
      components: (
        await Promise.all(preview.instances.map((instance) => libraryRepository.getComponent(instance.componentId)))
      ).filter((component): component is NonNullable<typeof component> => component !== null)
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not load saved preview"
    };
  }
}

export async function handleApplySavedPreviewOnTab(
  message: ApplySavedPreviewOnTabMessage
): Promise<ApplySavedPreviewOnTabResponse> {
  try {
    await libraryRepository.initLibrary();
    const preview = await libraryRepository.getSavedPreview(message.payload.previewId);
    if (!preview || preview.status !== "active") {
      return { ok: false, error: "Saved preview not found" };
    }

    const tab = await requireActiveTab();
    await assertPreviewEligibleTab(tab.id!);
    const activeTabOrigin = getTabOrigin(tab.url);
    if (!activeTabOrigin) {
      return { ok: false, error: "Could not determine active tab origin" };
    }
    if (activeTabOrigin !== preview.target.origin) {
      return {
        ok: false,
        error: `Saved preview is locked to ${preview.target.origin}`
      };
    }
    await injectPreviewRuntime(tab.id!);
    await chrome.tabs.sendMessage(
      tab.id!,
      {
        type: "APPLY_SAVED_PREVIEW",
        payload: {
          previewId: message.payload.previewId
        }
      } satisfies ApplySavedPreviewMessage
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not apply saved preview on tab"
    };
  }
}

export async function handleRequestAdaptationPatch(
  message: RequestAdaptationPatchMessage
): Promise<RequestAdaptationPatchResponse> {
  return requestAdaptationPatch(message.payload);
}

export async function handleSaveAdaptedComponentRevision(
  message: SaveAdaptedComponentRevisionMessage
): Promise<SaveAdaptedComponentRevisionResponse> {
  try {
    await libraryRepository.initLibrary();
    const component = await libraryRepository.getComponent(message.payload.componentId);
    if (!component) {
      return {
        ok: false,
        error: "Component not found"
      };
    }
    const adaptedSnapshot = createAdaptedComponentSnapshot(component, {
      adaptedHtml: message.payload.adaptedHtml,
      adaptedCssText: message.payload.adaptedCssText,
      summary: message.payload.summary,
      warnings: message.payload.warnings,
      confidence: message.payload.confidence,
      themeFingerprint: message.payload.themeFingerprint
    });
    const savedComponent = await libraryApplicationService.saveComponent(adaptedSnapshot);
    return {
      ok: true,
      component: savedComponent
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save adapted revision"
    };
  }
}

function getTabOrigin(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

async function notifyRuntimeListeners(message: PreviewStatusMessage): Promise<void> {
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    // Ignore when no extension views are listening.
  }
}
