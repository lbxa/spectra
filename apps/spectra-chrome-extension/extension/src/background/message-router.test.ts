import type { StartPreviewMessage } from "@/lib/library/messages";
import type { SavedComponent } from "@/lib/library/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMessageRouterHandlers } from "./message-router";

type RouterDeps = Parameters<typeof createMessageRouterHandlers>[0];

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

function createDeps(): RouterDeps {
  return {
    repository: {
      initLibrary: vi.fn(async () => undefined),
      saveSavedPreview: vi.fn(async (preview) => preview),
      listSavedPreviewsForPage: vi.fn(async () => []),
      getSavedPreview: vi.fn(async () => null),
      getComponent: vi.fn(async () => null)
    },
    injectPreviewRuntime: vi.fn(async () => undefined),
    requireActiveTab: vi.fn(async () => ({ id: 101, url: "https://example.com/products" })),
    assertPreviewEligibleTab: vi.fn(async () => undefined),
    setPreviewSession: vi.fn(async () => undefined),
    updatePreviewSession: vi.fn(async () => undefined),
    sendTabMessage: vi.fn(async () => undefined),
    notifyRuntimeListeners: vi.fn(async () => undefined)
  };
}

describe("message-router", () => {
  let deps: RouterDeps;
  let handlers: ReturnType<typeof createMessageRouterHandlers>;

  beforeEach(() => {
    deps = createDeps();
    handlers = createMessageRouterHandlers(deps);
  });

  describe("handleStartPreview", () => {
    it("rejects when active collection id is missing", async () => {
      const response = await handlers.handleStartPreview(createStartPreviewMessage({ activeCollectionId: "" }));

      expect(response).toEqual({
        ok: false,
        error: "Missing active collection id"
      });
      expect(deps.setPreviewSession).not.toHaveBeenCalled();
    });

    it("stores active collection id in preview session", async () => {
      const message = createStartPreviewMessage({ activeCollectionId: "col-power" });
      const response = await handlers.handleStartPreview(message);

      expect(response).toEqual({ ok: true });
      expect(deps.requireActiveTab).toHaveBeenCalledOnce();
      expect(deps.assertPreviewEligibleTab).toHaveBeenCalledWith(101);
      expect(deps.setPreviewSession).toHaveBeenCalledWith(
        expect.objectContaining({
          tabId: 101,
          componentId: "cmp-1",
          activeCollectionId: "col-power",
          status: "starting"
        })
      );
      expect(deps.injectPreviewRuntime).toHaveBeenCalledWith(101);
      expect(deps.sendTabMessage).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          type: "BEGIN_TARGETING",
          component: message.component
        })
      );
      expect(deps.updatePreviewSession).toHaveBeenCalledWith(101, { status: "active" });
    });
  });

  describe("saved preview router handlers", () => {
    it("saves preview scenes through repository", async () => {
      const payload = {
        id: "pv-1",
        name: "Preview",
        status: "active",
        target: {
          origin: "https://example.com",
          pathname: "/products",
          matchMode: "exact_path",
          canonicalUrl: "https://example.com/products"
        },
        instances: [],
        createdAt: "2026-03-30T12:00:00.000Z",
        updatedAt: "2026-03-30T12:00:00.000Z",
        revision: 1,
        schemaVersion: 1
      } as const;

      const response = await handlers.handleSavePreviewScene({
        type: "SAVE_PREVIEW_SCENE",
        payload
      });

      expect(response.ok).toBe(true);
      expect(deps.repository.saveSavedPreview).toHaveBeenCalledWith(payload);
    });

    it("lists saved previews by page target", async () => {
      vi.mocked(deps.repository.listSavedPreviewsForPage).mockResolvedValueOnce([
        {
          id: "pv-1",
          name: "Preview",
          status: "active",
          target: {
            origin: "https://example.com",
            pathname: "/products",
            matchMode: "exact_path",
            canonicalUrl: "https://example.com/products"
          },
          createdAt: "2026-03-30T12:00:00.000Z",
          updatedAt: "2026-03-30T12:00:00.000Z",
          revision: 1
        }
      ]);

      const response = await handlers.handleListSavedPreviewsForPage({
        type: "LIST_SAVED_PREVIEWS_FOR_PAGE",
        payload: {
          origin: "https://example.com",
          pathname: "/products"
        }
      });

      expect(response).toMatchObject({
        ok: true,
        previews: [{ id: "pv-1" }]
      });
    });

    it("hydrates components when loading preview for apply", async () => {
      vi.mocked(deps.repository.getSavedPreview).mockResolvedValueOnce({
        id: "pv-1",
        name: "Preview",
        status: "active",
        target: {
          origin: "https://example.com",
          pathname: "/products",
          matchMode: "exact_path",
          canonicalUrl: "https://example.com/products"
        },
        instances: [
          {
            id: "instance-1",
            componentId: "cmp-1",
            componentVersion: 1,
            placement: {
              anchor: {
                strategy: "selector",
                primarySelector: "main",
                fallbackSelectors: []
              },
              insertionMode: "inside",
              alignment: "start",
              order: 1
            },
            render: { visible: true }
          }
        ],
        createdAt: "2026-03-30T12:00:00.000Z",
        updatedAt: "2026-03-30T12:00:00.000Z",
        revision: 1,
        schemaVersion: 1
      });

      vi.mocked(deps.repository.getComponent).mockResolvedValueOnce(createComponent("cmp-1"));
      const response = await handlers.handleApplySavedPreview({
        type: "APPLY_SAVED_PREVIEW",
        payload: { previewId: "pv-1" }
      });

      expect(response).toMatchObject({
        ok: true,
        preview: { id: "pv-1" }
      });
      expect(response.components).toHaveLength(1);
    });

    it("dispatches apply command to active tab runtime", async () => {
      vi.mocked(deps.repository.getSavedPreview).mockResolvedValueOnce({
        id: "pv-1",
        name: "Preview",
        status: "active",
        target: {
          origin: "https://example.com",
          pathname: "/products",
          matchMode: "exact_path",
          canonicalUrl: "https://example.com/products"
        },
        instances: [],
        createdAt: "2026-03-30T12:00:00.000Z",
        updatedAt: "2026-03-30T12:00:00.000Z",
        revision: 1,
        schemaVersion: 1
      });
      const response = await handlers.handleApplySavedPreviewOnTab({
        type: "APPLY_SAVED_PREVIEW_ON_TAB",
        payload: {
          previewId: "pv-1"
        }
      });

      expect(response).toEqual({ ok: true });
      expect(deps.injectPreviewRuntime).toHaveBeenCalledWith(101);
      expect(deps.sendTabMessage).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          type: "APPLY_SAVED_PREVIEW",
          payload: {
            previewId: "pv-1"
          }
        })
      );
    });

    it("blocks apply on origin mismatch", async () => {
      vi.mocked(deps.repository.getSavedPreview).mockResolvedValueOnce({
        id: "pv-2",
        name: "Preview",
        status: "active",
        target: {
          origin: "https://docs.example.com",
          pathname: "/products",
          matchMode: "exact_path",
          canonicalUrl: "https://docs.example.com/products"
        },
        instances: [],
        createdAt: "2026-03-30T12:00:00.000Z",
        updatedAt: "2026-03-30T12:00:00.000Z",
        revision: 1,
        schemaVersion: 1
      });

      const response = await handlers.handleApplySavedPreviewOnTab({
        type: "APPLY_SAVED_PREVIEW_ON_TAB",
        payload: {
          previewId: "pv-2"
        }
      });

      expect(response).toEqual({
        ok: false,
        error: "Saved preview is locked to https://docs.example.com"
      });
      expect(deps.injectPreviewRuntime).not.toHaveBeenCalled();
      expect(deps.sendTabMessage).not.toHaveBeenCalled();
    });
  });

  describe("handlePreviewStatus", () => {
    it("routes magic status events and keeps session active", async () => {
      await handlers.handlePreviewStatus(
        {
          type: "MAGIC_REQUEST_STARTED",
          previewId: "preview-1",
          componentId: "cmp-1"
        },
        {
          tab: {
            id: 101
          }
        } as chrome.runtime.MessageSender
      );

      expect(deps.updatePreviewSession).toHaveBeenCalledWith(101, { status: "active" });
      expect(deps.notifyRuntimeListeners).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MAGIC_REQUEST_STARTED"
        })
      );
    });
  });
});
