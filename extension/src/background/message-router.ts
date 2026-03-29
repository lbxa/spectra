import type {
  BeginTargetingMessage,
  PreviewStatusMessage,
  SaveComponentResponse,
  StartPreviewMessage
} from "../lib/library/messages";
import { injectPreviewRuntime } from "./injector";
import { assertPreviewEligibleTab, requireActiveTab } from "./tab-gate";
import { setPreviewSession, updatePreviewSession } from "./session-store";

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

async function notifyRuntimeListeners(message: PreviewStatusMessage): Promise<void> {
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    // Ignore when no extension views are listening.
  }
}
