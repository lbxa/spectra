import type { StartPreviewMessage } from "@/lib/library/messages";
import type { SavedComponent } from "@/lib/library/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleApplySavedPreview,
  handleApplySavedPreviewOnTab,
  handleRequestAdaptationPatch,
  handleSaveAdaptedComponentRevision,
  handleListSavedPreviewsForPage,
  handleSavePreviewScene,
  handleStartPreview
} from "./message-router";

vi.mock("./injector", () => ({
  injectPreviewRuntime: vi.fn(async () => undefined)
}));

vi.mock("./tab-gate", () => ({
  requireActiveTab: vi.fn(async () => ({ id: 101, url: "https://example.com/products" })),
  assertPreviewEligibleTab: vi.fn(async () => undefined)
}));

vi.mock("./session-store", () => ({
  setPreviewSession: vi.fn(async () => undefined),
  updatePreviewSession: vi.fn(async () => undefined)
}));

vi.mock("./adaptation/client", () => ({
  requestAdaptationPatch: vi.fn(async () => ({
    ok: true,
    patch: {
      strategy: "css_override",
      summary: "Adapted",
      overrideCss: "#spectra-root { color: inherit; }",
      attributeEdits: [],
      preservedNodeIds: [],
      confidence: 0.6,
      warnings: []
    }
  }))
}));

vi.mock("../lib/library/repository", () => ({
  libraryRepository: {
    initLibrary: vi.fn(async () => undefined),
    saveSavedPreview: vi.fn(async (preview) => preview),
    listSavedPreviewsForPage: vi.fn(async () => []),
    getSavedPreview: vi.fn(async () => null),
    getComponent: vi.fn(async () => null),
    saveComponent: vi.fn(async (component) => component)
  }
}));

const { injectPreviewRuntime } = await import("./injector");
const { requireActiveTab, assertPreviewEligibleTab } = await import("./tab-gate");
const { setPreviewSession, updatePreviewSession } = await import("./session-store");
const { requestAdaptationPatch } = await import("./adaptation/client");
const { libraryRepository } = await import("../lib/library/repository");

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
  vi.clearAllMocks();
  Reflect.set(globalThis, "chrome", {
    runtime: {
      sendMessage: vi.fn(async () => undefined)
    },
    tabs: {
      sendMessage: vi.fn(async () => undefined)
    }
  });
  vi.mocked(requireActiveTab).mockResolvedValue({ id: 101, url: "https://example.com/products" });
});

describe("handleStartPreview", () => {
  it("rejects when active collection id is missing", async () => {
    const response = await handleStartPreview(createStartPreviewMessage({ activeCollectionId: "" }));

    expect(response).toEqual({
      ok: false,
      error: "Missing active collection id"
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

    const response = await handleSavePreviewScene({
      type: "SAVE_PREVIEW_SCENE",
      payload
    });

    expect(response.ok).toBe(true);
    expect(libraryRepository.saveSavedPreview).toHaveBeenCalledWith(payload);
  });

  it("lists saved previews by page target", async () => {
    vi.mocked(libraryRepository.listSavedPreviewsForPage).mockResolvedValueOnce([
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

    const response = await handleListSavedPreviewsForPage({
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
    vi.mocked(libraryRepository.getSavedPreview).mockResolvedValueOnce({
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

    vi.mocked(libraryRepository.getComponent).mockResolvedValueOnce(createComponent("cmp-1"));
    const response = await handleApplySavedPreview({
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
    vi.mocked(libraryRepository.getSavedPreview).mockResolvedValueOnce({
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
    const response = await handleApplySavedPreviewOnTab({
      type: "APPLY_SAVED_PREVIEW_ON_TAB",
      payload: {
        previewId: "pv-1"
      }
    });

    expect(response).toEqual({ ok: true });
    expect(injectPreviewRuntime).toHaveBeenCalledWith(101);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
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
    vi.mocked(libraryRepository.getSavedPreview).mockResolvedValueOnce({
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

    const response = await handleApplySavedPreviewOnTab({
      type: "APPLY_SAVED_PREVIEW_ON_TAB",
      payload: {
        previewId: "pv-2"
      }
    });

    expect(response).toEqual({
      ok: false,
      error: "Saved preview is locked to https://docs.example.com"
    });
    expect(injectPreviewRuntime).not.toHaveBeenCalled();
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it("forwards adaptation patch requests through adaptation client", async () => {
    const response = await handleRequestAdaptationPatch({
      type: "REQUEST_ADAPTATION_PATCH",
      payload: {
        targetSiteContext: {
          page: {
            origin: "https://example.com",
            pathname: "/products",
            title: "Example"
          },
          theme: {
            colors: ["rgb(15, 23, 42)"],
            fontFamilies: ["Inter"],
            spacingPx: [8],
            radiusPx: [8],
            shadows: ["none"]
          },
          insertionZone: {
            tagName: "section",
            display: "block",
            color: "rgb(15, 23, 42)",
            backgroundColor: "rgb(255, 255, 255)",
            fontFamily: "Inter",
            fontSizePx: 14,
            lineHeightPx: 20,
            borderRadiusPx: 8
          },
          nativeExemplars: [],
          hardConstraints: {
            maxPatchCssBytes: 16000,
            protectedNodeIds: [],
            forbiddenPatterns: []
          },
          metadata: {
            extractedAt: "2026-04-01T12:00:00.000Z",
            themeFingerprint: "theme_1"
          }
        },
        componentPack: {
          wrapperRootId: "spectra-root",
          semanticRoleHint: "button",
          normalizedHtml: "<button data-spectra-node-id='n1'>Button</button>",
          baseCss: "#spectra-root button { color: inherit; }",
          stableNodeIds: ["n1"],
          protectedNodeIds: []
        }
      }
    });

    expect(response.ok).toBe(true);
    expect(requestAdaptationPatch).toHaveBeenCalledOnce();
  });

  it("saves adapted component revision as new active snapshot", async () => {
    vi.mocked(libraryRepository.getComponent).mockResolvedValueOnce({
      ...createComponent("cmp-1"),
      html: "<div data-spectra-node-id='n1'>old</div>",
      cssText: "#old { color: red; }"
    });
    const response = await handleSaveAdaptedComponentRevision({
      type: "SAVE_ADAPTED_COMPONENT_REVISION",
      payload: {
        componentId: "cmp-1",
        adaptedHtml: "<div data-spectra-node-id='n1'>new</div>",
        adaptedCssText: "#new { color: blue; }",
        summary: "Adapted to target theme",
        warnings: ["contrast tuned"],
        confidence: 0.72,
        themeFingerprint: "theme_abc"
      }
    });

    expect(response.ok).toBe(true);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "LIBRARY_UPDATED"
      })
    );
    expect(response).toMatchObject({
      ok: true,
      component: {
        id: "cmp-1",
        html: "<div data-spectra-node-id='n1'>new</div>",
        cssText: "#new { color: blue; }",
        activeRevisionId: 2
      }
    });
    expect(libraryRepository.saveComponent).toHaveBeenCalledOnce();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "LIBRARY_UPDATED"
      })
    );
    expect(response.component).toMatchObject({
      activeRevisionId: 2
    });
    expect(response.component?.revisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          source: "capture",
          isActive: false
        }),
        expect.objectContaining({
          id: 2,
          source: "adaptation",
          isActive: true
        })
      ])
    );
    expect(response.component).toMatchObject(
      expect.objectContaining({
        id: "cmp-1",
        html: "<div data-spectra-node-id='n1'>new</div>",
        cssText: "#new { color: blue; }",
        activeRevisionId: 2
      })
    );
  });
});
