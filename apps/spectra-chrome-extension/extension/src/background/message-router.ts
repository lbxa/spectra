import type {
  ApplySavedPreviewOnTabMessage,
  ApplySavedPreviewOnTabResponse,
  ApplySavedPreviewMessage,
  ApplySavedPreviewResponse,
  BeginTargetingMessage,
  ListSavedPreviewsForPageMessage,
  ListSavedPreviewsForPageResponse,
  MagicStatusMessage,
  PreviewStatusMessage,
  SavePreviewSceneMessage,
  SavePreviewSceneResponse,
  SaveComponentResponse,
  StartPreviewMessage
} from "../lib/library/messages";
import type { LibraryRepository } from "../lib/library/types";
import { libraryRepository } from "../lib/library/repository";
import { injectPreviewRuntime } from "./injector";
import { assertPreviewEligibleTab, requireActiveTab } from "./tab-gate";
import { setPreviewSession, updatePreviewSession } from "./session-store";

type MessageRouterDeps = {
  repository: Pick<
    LibraryRepository,
    "initLibrary" | "saveSavedPreview" | "listSavedPreviewsForPage" | "getSavedPreview" | "getComponent"
  >;
  injectPreviewRuntime: (tabId: number) => Promise<void>;
  requireActiveTab: typeof requireActiveTab;
  assertPreviewEligibleTab: typeof assertPreviewEligibleTab;
  setPreviewSession: typeof setPreviewSession;
  updatePreviewSession: typeof updatePreviewSession;
  sendTabMessage: (tabId: number, message: unknown) => Promise<void>;
  notifyRuntimeListeners: (message: PreviewStatusMessage) => Promise<void>;
};

const defaultMessageRouterDeps: MessageRouterDeps = {
  repository: libraryRepository,
  injectPreviewRuntime,
  requireActiveTab,
  assertPreviewEligibleTab,
  setPreviewSession,
  updatePreviewSession,
  sendTabMessage: async (tabId, message) => {
    await chrome.tabs.sendMessage(tabId, message);
  },
  notifyRuntimeListeners: async (message) => {
    try {
      await chrome.runtime.sendMessage(message);
    } catch {
      // Ignore when no extension views are listening.
    }
  }
};

export function createMessageRouterHandlers(deps: MessageRouterDeps) {
  const handleStartPreview = async (message: StartPreviewMessage): Promise<SaveComponentResponse> => {
    if (!message.component?.id) {
      return { ok: false, error: "Missing component payload" };
    }
    if (typeof message.activeCollectionId !== "string" || message.activeCollectionId.trim().length === 0) {
      return { ok: false, error: "Missing active collection id" };
    }

    try {
      const tab = await deps.requireActiveTab();
      await deps.assertPreviewEligibleTab(tab.id!);

      await deps.setPreviewSession({
        tabId: tab.id!,
        componentId: message.component.id,
        activeCollectionId: message.activeCollectionId,
        status: "starting",
        updatedAt: new Date().toISOString()
      });

      await deps.injectPreviewRuntime(tab.id!);
      await deps.sendTabMessage(
        tab.id!,
        {
          type: "BEGIN_TARGETING",
          component: message.component
        } satisfies BeginTargetingMessage
      );

      await deps.updatePreviewSession(tab.id!, { status: "active" });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not start preview"
      };
    }
  };

  const handlePreviewStatus = async (
    message: PreviewStatusMessage,
    sender: chrome.runtime.MessageSender
  ): Promise<void> => {
    const tabId = sender.tab?.id;
    if (typeof tabId !== "number") {
      return;
    }

    if (message.type === "PREVIEW_READY") {
      await deps.updatePreviewSession(tabId, { status: "active" });
    } else if (message.type === "PREVIEW_INSERTED") {
      await deps.updatePreviewSession(tabId, {
        status: "active",
        lastPreviewId: message.previewId,
        lastRelation: message.relation,
        lastErrorCode: undefined
      });
    } else if (message.type === "PREVIEW_REMOVED") {
      await deps.updatePreviewSession(tabId, {
        status: "closed",
        lastPreviewId: message.previewId
      });
    } else if (message.type === "PREVIEW_ERROR") {
      await deps.updatePreviewSession(tabId, {
        status: "error",
        lastErrorCode: message.code
      });
    } else if (isMagicStatusMessage(message)) {
      await deps.updatePreviewSession(tabId, {
        status: "active"
      });
    }

    await deps.notifyRuntimeListeners(message);
  };

  const handleSavePreviewScene = async (
    message: SavePreviewSceneMessage
  ): Promise<SavePreviewSceneResponse> => {
    try {
      await deps.repository.initLibrary();
      const preview = await deps.repository.saveSavedPreview(message.payload);
      return { ok: true, preview };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not save preview scene"
      };
    }
  };

  const handleListSavedPreviewsForPage = async (
    message: ListSavedPreviewsForPageMessage
  ): Promise<ListSavedPreviewsForPageResponse> => {
    try {
      await deps.repository.initLibrary();
      const previews = await deps.repository.listSavedPreviewsForPage(message.payload);
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
  };

  const handleApplySavedPreview = async (
    message: ApplySavedPreviewMessage
  ): Promise<ApplySavedPreviewResponse> => {
    try {
      await deps.repository.initLibrary();
      const preview = await deps.repository.getSavedPreview(message.payload.previewId);
      if (!preview || preview.status !== "active") {
        return { ok: false, error: "Saved preview not found" };
      }
      return {
        ok: true,
        preview,
        components: (
          await Promise.all(preview.instances.map((instance) => deps.repository.getComponent(instance.componentId)))
        ).filter((component): component is NonNullable<typeof component> => component !== null)
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load saved preview"
      };
    }
  };

  const handleApplySavedPreviewOnTab = async (
    message: ApplySavedPreviewOnTabMessage
  ): Promise<ApplySavedPreviewOnTabResponse> => {
    try {
      await deps.repository.initLibrary();
      const preview = await deps.repository.getSavedPreview(message.payload.previewId);
      if (!preview || preview.status !== "active") {
        return { ok: false, error: "Saved preview not found" };
      }

      const tab = await deps.requireActiveTab();
      await deps.assertPreviewEligibleTab(tab.id!);
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
      await deps.injectPreviewRuntime(tab.id!);
      await deps.sendTabMessage(
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
  };

  return {
    handleStartPreview,
    handlePreviewStatus,
    handleSavePreviewScene,
    handleListSavedPreviewsForPage,
    handleApplySavedPreview,
    handleApplySavedPreviewOnTab
  };
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

function isMagicStatusMessage(message: PreviewStatusMessage): message is MagicStatusMessage {
  return (
    message.type === "MAGIC_CLICKED" ||
    message.type === "MAGIC_REQUEST_STARTED" ||
    message.type === "MAGIC_REQUEST_SUCCEEDED" ||
    message.type === "MAGIC_REQUEST_FAILED" ||
    message.type === "MAGIC_PATCH_APPLIED" ||
    message.type === "MAGIC_PATCH_REJECTED" ||
    message.type === "MAGIC_ADAPTED_REVISION_SAVED"
  );
}

const defaultHandlers = createMessageRouterHandlers(defaultMessageRouterDeps);

export const handleStartPreview = defaultHandlers.handleStartPreview;
export const handlePreviewStatus = defaultHandlers.handlePreviewStatus;
export const handleSavePreviewScene = defaultHandlers.handleSavePreviewScene;
export const handleListSavedPreviewsForPage = defaultHandlers.handleListSavedPreviewsForPage;
export const handleApplySavedPreview = defaultHandlers.handleApplySavedPreview;
export const handleApplySavedPreviewOnTab = defaultHandlers.handleApplySavedPreviewOnTab;
