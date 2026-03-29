import type { StartPreviewMessage } from "@/lib/library/messages";
import type { SavedComponent } from "@/lib/library/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleStartPreview } from "./message-router";

vi.mock("./injector", () => ({
  injectPreviewRuntime: vi.fn(async () => undefined)
}));

vi.mock("./tab-gate", () => ({
  requireActiveTab: vi.fn(async () => ({ id: 101 })),
  assertPreviewEligibleTab: vi.fn(async () => undefined)
}));

vi.mock("./session-store", () => ({
  setPreviewSession: vi.fn(async () => undefined),
  updatePreviewSession: vi.fn(async () => undefined)
}));

const { injectPreviewRuntime } = await import("./injector");
const { requireActiveTab, assertPreviewEligibleTab } = await import("./tab-gate");
const { setPreviewSession, updatePreviewSession } = await import("./session-store");

function createComponent(id: string): SavedComponent {
  return {
    id,
    collectionIds: ["col-1"],
    url: "https://example.com",
    title: id,
    capturedAt: new Date().toISOString(),
    html: "<div></div>",
    cssText: "",
    screenshotDataUrl: "data:image/png;base64,abc",
    sourceHostSignature: {
      landmark: "unknown",
      hostTag: "div",
      layoutMode: "unknown",
      widthBucket: "md",
      depth: 0,
      siblingCount: 0,
      ancestorTags: []
    }
  };
}

function createStartPreviewMessage(overrides: Partial<StartPreviewMessage> = {}): StartPreviewMessage {
  return {
    type: "START_PREVIEW",
    component: createComponent("cmp-1"),
    activeCollectionId: "col-1",
    ...overrides
  };
}

beforeEach(() => {
  Reflect.set(globalThis, "chrome", {
    tabs: {
      sendMessage: vi.fn(async () => undefined)
    }
  });
});

describe("handleStartPreview", () => {
  it("rejects when active collection id is missing", async () => {
    const response = await handleStartPreview(createStartPreviewMessage({ activeCollectionId: "" }));

    expect(response).toEqual({
      ok: false,
      error: "Missing active collection id."
    });
    expect(setPreviewSession).not.toHaveBeenCalled();
  });

  it("stores active collection id in preview session", async () => {
    const message = createStartPreviewMessage({ activeCollectionId: "col-power" });
    const response = await handleStartPreview(message);

    expect(response).toEqual({ ok: true });
    expect(requireActiveTab).toHaveBeenCalledOnce();
    expect(assertPreviewEligibleTab).toHaveBeenCalledWith(101);
    expect(setPreviewSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tabId: 101,
        componentId: "cmp-1",
        activeCollectionId: "col-power",
        status: "starting"
      })
    );
    expect(injectPreviewRuntime).toHaveBeenCalledWith(101);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      101,
      expect.objectContaining({
        type: "BEGIN_TARGETING",
        component: message.component
      })
    );
    expect(updatePreviewSession).toHaveBeenCalledWith(101, { status: "active" });
  });
});
