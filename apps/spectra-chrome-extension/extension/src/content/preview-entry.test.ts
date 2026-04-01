import type { SavedComponent } from "../lib/library/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  insertCount: 0,
  candidate: null as {
    element: HTMLElement;
    rect: DOMRect;
    signature: SavedComponent["sourceHostSignature"];
  } | null,
  watchCallbacks: new Map<string, () => void>(),
  sessionToolbarHandlers: null as {
    onSave: () => void;
    onLoadPreviews: () => void;
    onApplyPreview: (previewId: string) => void;
    onClearAll: () => void;
    onExit: () => void;
  } | null,
  toasts: [] as string[],
  overlayFlashCalls: 0
}));

vi.mock("./candidate-scan", () => ({
  scanCandidateContainers: vi.fn(() => (testState.candidate ? [testState.candidate] : []))
}));

vi.mock("./candidate-rank", () => ({
  rankCandidates: vi.fn((candidates: unknown[]) => candidates)
}));

vi.mock("./overlay-root", () => ({
  mountOverlayRoot: vi.fn(() => {
    const root = document.createElement("div");
    const hoverOutline = document.createElement("div");
    const parentOutline = document.createElement("div");
    parentOutline.setAttribute("data-mock-parent-outline", "true");
    const selectedOutline = document.createElement("div");
    const ghost = document.createElement("div");
    const label = document.createElement("div");
    const controlsHost = document.createElement("div");
    root.append(hoverOutline, parentOutline, selectedOutline, ghost, label, controlsHost);
    document.body.appendChild(root);
    return {
      root,
      hoverOutline,
      parentOutline,
      selectedOutline,
      ghost,
      label,
      controlsHost,
      showToast: vi.fn((message: string) => {
        testState.toasts.push(message);
      }),
      showFlash: vi.fn(() => {
        testState.overlayFlashCalls += 1;
      }),
      destroy: () => root.remove()
    };
  })
}));

vi.mock("./preview-insert", () => ({
  insertPreview: vi.fn(
    (
      host: HTMLElement,
      component: SavedComponent,
      relation: "before" | "inside" | "after"
    ): { previewId: string; wrapper: HTMLDivElement; content: HTMLDivElement } => {
      testState.insertCount += 1;
      const previewId = `preview_${testState.insertCount}`;
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-spectra-preview-id", previewId);
      const content = document.createElement("div");
      content.textContent = component.title;
      wrapper.appendChild(content);
      wrapper.getBoundingClientRect = () => new DOMRect(10, 20, 300, 180);
      content.getBoundingClientRect = () => new DOMRect(30, 40, 120, 60);

      if (relation === "before" && host.parentElement) {
        host.parentElement.insertBefore(wrapper, host);
      } else if (relation === "after" && host.parentElement) {
        host.parentElement.insertBefore(wrapper, host.nextSibling);
      } else {
        host.appendChild(wrapper);
      }

      return { previewId, wrapper, content };
    }
  )
}));

vi.mock("./preview-toolbar", () => ({
  createPreviewToolbar: vi.fn((handlers: { onUndo: () => void }) => {
    const toolbar = document.createElement("div");
    toolbar.setAttribute("data-mock-toolbar", "true");
    const undo = document.createElement("button");
    undo.setAttribute("data-action", "undo");
    undo.addEventListener("click", handlers.onUndo);
    toolbar.appendChild(undo);

    return {
      mount(target: HTMLElement) {
        const previewId = target.getAttribute("data-spectra-preview-id") ?? "";
        toolbar.setAttribute("data-for-preview-id", previewId);
        document.body.appendChild(toolbar);
      },
      unmount() {
        toolbar.remove();
      }
    };
  })
}));

vi.mock("./preview-session-toolbar", () => ({
  createPreviewSessionToolbar: vi.fn((handlers: typeof testState.sessionToolbarHandlers) => {
    testState.sessionToolbarHandlers = handlers;
    return {
      mount: vi.fn(),
      update: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      unmount: vi.fn()
    };
  })
}));

vi.mock("./mutation-watch", () => ({
  watchPreviewRemoval: vi.fn((previewId: string, onRemoved: () => void) => {
    testState.watchCallbacks.set(previewId, onRemoved);
    return {
      stop: () => {
        testState.watchCallbacks.delete(previewId);
      }
    };
  }),
  __triggerPreviewRemoval: (previewId: string) => {
    testState.watchCallbacks.get(previewId)?.();
  }
}));

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

function createCandidateHost(id: string): HTMLElement {
  const host = document.createElement("section");
  host.id = id;
  host.getBoundingClientRect = () => new DOMRect(10, 20, 240, 120);
  document.body.appendChild(host);
  return host;
}

async function flushWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("preview-entry multi preview behavior", () => {
  let listeners: Array<(message: unknown) => void> = [];

  beforeEach(() => {
    vi.resetModules();
    testState.insertCount = 0;
    testState.candidate = null;
    testState.watchCallbacks.clear();
    testState.sessionToolbarHandlers = null;
    testState.toasts = [];
    testState.overlayFlashCalls = 0;
    listeners = [];
    document.body.innerHTML = "";
    Reflect.set(globalThis, "chrome", {
      runtime: {
        onMessage: {
          addListener: (listener: (message: unknown) => void) => {
            listeners.push(listener);
          },
          removeListener: (listener: (message: unknown) => void) => {
            listeners = listeners.filter((current) => current !== listener);
          }
        },
        sendMessage: vi.fn(async () => undefined)
      }
    });
  });

  afterEach(() => {
    const runtimeWindow = window as Window & { __spectraPreviewRuntimeV1__?: { teardown: () => void } };
    runtimeWindow.__spectraPreviewRuntimeV1__?.teardown();
    document.body.innerHTML = "";
    listeners = [];
  });

  async function loadRuntime(): Promise<void> {
    await import("./preview-entry");
  }

  async function beginTargeting(component: SavedComponent): Promise<void> {
    for (const listener of listeners) {
      listener({ type: "BEGIN_TARGETING", component });
    }
    await flushWork();
  }

  it("keeps multiple inserted previews and shows one toolbar per preview", async () => {
    const firstHost = createCandidateHost("host-1");
    const secondHost = createCandidateHost("host-2");
    await loadRuntime();

    testState.candidate = {
      element: firstHost,
      rect: firstHost.getBoundingClientRect(),
      signature: createComponent("cmp-1").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-1"));
    firstHost.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushWork();

    testState.candidate = {
      element: secondHost,
      rect: secondHost.getBoundingClientRect(),
      signature: createComponent("cmp-2").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-2"));
    secondHost.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushWork();

    expect(document.querySelectorAll("[data-spectra-preview-id]")).toHaveLength(2);
    expect(document.querySelectorAll("[data-mock-toolbar='true']")).toHaveLength(2);
  });

  it("keeps existing inserted previews when targeting is cancelled with Escape", async () => {
    const firstHost = createCandidateHost("host-1");
    const secondHost = createCandidateHost("host-2");
    await loadRuntime();

    testState.candidate = {
      element: firstHost,
      rect: firstHost.getBoundingClientRect(),
      signature: createComponent("cmp-1").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-1"));
    firstHost.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushWork();

    testState.candidate = {
      element: secondHost,
      rect: secondHost.getBoundingClientRect(),
      signature: createComponent("cmp-2").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-2"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushWork();

    expect(document.querySelectorAll("[data-spectra-preview-id]")).toHaveLength(1);
  });

  it("shows shared shortcuts HUD in targeting with Shift active state", async () => {
    const host = createCandidateHost("host-shortcuts");
    await loadRuntime();

    testState.candidate = {
      element: host,
      rect: host.getBoundingClientRect(),
      signature: createComponent("cmp-shortcuts").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-shortcuts"));

    const panel = document.querySelector("[data-component-picker-shortcuts='true']");
    if (!(panel instanceof HTMLElement)) {
      throw new Error("Expected shortcuts panel");
    }
    expect(panel.textContent).toContain("Exit preview");

    const shiftKey = Array.from(panel.querySelectorAll("span")).find((node) => node.textContent === "Shift");
    if (!(shiftKey instanceof HTMLElement)) {
      throw new Error("Expected Shift shortcut key");
    }

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true }));
    expect(shiftKey.style.borderColor).toContain("217, 70, 239");

    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", bubbles: true }));
    expect(shiftKey.style.borderColor).toContain("148, 163, 184");
  });

  it("shows magenta parent outline while Shift targeting is active", async () => {
    const host = createCandidateHost("host-parent-outline");
    const child = document.createElement("div");
    host.appendChild(child);
    await loadRuntime();

    testState.candidate = {
      element: host,
      rect: host.getBoundingClientRect(),
      signature: createComponent("cmp-parent-outline").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-parent-outline"));

    child.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    const parentOutline = document.querySelector("[data-mock-parent-outline='true']");
    if (!(parentOutline instanceof HTMLElement)) {
      throw new Error("Expected parent outline");
    }
    expect(parentOutline.style.display).toBe("none");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true }));
    expect(parentOutline.style.display).toBe("block");

    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", bubbles: true }));
    expect(parentOutline.style.display).toBe("none");
  });

  it("removes only the latest active preview when Delete is pressed", async () => {
    const firstHost = createCandidateHost("host-1");
    const secondHost = createCandidateHost("host-2");
    await loadRuntime();

    testState.candidate = {
      element: firstHost,
      rect: firstHost.getBoundingClientRect(),
      signature: createComponent("cmp-1").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-1"));
    firstHost.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushWork();

    testState.candidate = {
      element: secondHost,
      rect: secondHost.getBoundingClientRect(),
      signature: createComponent("cmp-2").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-2"));
    secondHost.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushWork();

    expect(document.querySelector('[data-spectra-preview-id="preview_1"]')).not.toBeNull();
    expect(document.querySelector('[data-spectra-preview-id="preview_2"]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    await flushWork();

    expect(document.querySelector('[data-spectra-preview-id="preview_1"]')).not.toBeNull();
    expect(document.querySelector('[data-spectra-preview-id="preview_2"]')).toBeNull();
  });

  it("clears preview runtime singleton when exiting preview mode", async () => {
    const host = createCandidateHost("host-1");
    await loadRuntime();

    testState.candidate = {
      element: host,
      rect: host.getBoundingClientRect(),
      signature: createComponent("cmp-1").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-1"));
    host.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushWork();

    testState.sessionToolbarHandlers?.onExit();
    await flushWork();

    const runtimeWindow = window as Window & {
      __spectraPreviewRuntimeV1__?: { teardown: () => void };
    };
    expect(runtimeWindow.__spectraPreviewRuntimeV1__).toBeUndefined();
  });

  it("keeps other previews when one is removed by page mutation callback", async () => {
    const firstHost = createCandidateHost("host-1");
    const secondHost = createCandidateHost("host-2");
    await loadRuntime();

    testState.candidate = {
      element: firstHost,
      rect: firstHost.getBoundingClientRect(),
      signature: createComponent("cmp-1").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-1"));
    firstHost.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushWork();

    testState.candidate = {
      element: secondHost,
      rect: secondHost.getBoundingClientRect(),
      signature: createComponent("cmp-2").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-2"));
    secondHost.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushWork();

    const mutationWatch = (await import("./mutation-watch")) as unknown as {
      __triggerPreviewRemoval: (previewId: string) => void;
    };
    mutationWatch.__triggerPreviewRemoval("preview_1");
    await flushWork();

    expect(document.querySelector('[data-spectra-preview-id="preview_1"]')).toBeNull();
    expect(document.querySelector('[data-spectra-preview-id="preview_2"]')).not.toBeNull();
  });

  it("toolbar actions only remove the preview they belong to", async () => {
    const firstHost = createCandidateHost("host-1");
    const secondHost = createCandidateHost("host-2");
    await loadRuntime();

    testState.candidate = {
      element: firstHost,
      rect: firstHost.getBoundingClientRect(),
      signature: createComponent("cmp-1").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-1"));
    firstHost.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushWork();

    testState.candidate = {
      element: secondHost,
      rect: secondHost.getBoundingClientRect(),
      signature: createComponent("cmp-2").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-2"));
    secondHost.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushWork();

    const firstToolbarUndo = document.querySelector(
      '[data-mock-toolbar="true"][data-for-preview-id="preview_1"] [data-action="undo"]'
    );
    if (!(firstToolbarUndo instanceof HTMLButtonElement)) {
      throw new Error("Expected first preview toolbar undo button");
    }
    firstToolbarUndo.click();
    await flushWork();

    expect(document.querySelector('[data-spectra-preview-id="preview_1"]')).toBeNull();
    expect(document.querySelector('[data-spectra-preview-id="preview_2"]')).not.toBeNull();
  });

  it("saves current scene through global session toolbar action", async () => {
    const firstHost = createCandidateHost("host-1");
    await loadRuntime();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (message: unknown) => {
      if (isSavePreviewSceneMessage(message)) {
        return { ok: true };
      }
      if (
        typeof message === "object" &&
        message !== null &&
        Reflect.get(message, "type") === "LIST_SAVED_PREVIEWS_FOR_PAGE"
      ) {
        return { ok: true, previews: [] };
      }
      return undefined;
    });

    testState.candidate = {
      element: firstHost,
      rect: firstHost.getBoundingClientRect(),
      signature: createComponent("cmp-1").sourceHostSignature
    };
    await beginTargeting(createComponent("cmp-1"));
    firstHost.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushWork();

    testState.sessionToolbarHandlers?.onSave();
    await flushWork();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SAVE_PREVIEW_SCENE"
      })
    );
    const sentSavePayload = vi
      .mocked(chrome.runtime.sendMessage)
      .mock.calls
      .map(([message]) => message)
      .find((message) => isSavePreviewSceneMessage(message));

    const firstInstanceLayout = sentSavePayload?.payload.instances?.[0]?.layout?.normalizedRect;
    const referenceWidth = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const referenceHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    expect(firstInstanceLayout).toBeDefined();
    expect(firstInstanceLayout?.width).toBeCloseTo(120 / referenceWidth, 5);
    expect(firstInstanceLayout?.height).toBeCloseTo(60 / referenceHeight, 5);
    expect(firstInstanceLayout?.x).toBeCloseTo(30 / referenceWidth, 5);
    expect(firstInstanceLayout?.y).toBeCloseTo(40 / referenceHeight, 5);
    expect(testState.overlayFlashCalls).toBe(1);
  });

  it("applies saved preview from idle runtime and replays all instances", async () => {
    const firstHost = createCandidateHost("host-1");
    const secondHost = createCandidateHost("host-2");
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        Reflect.get(message, "type") === "APPLY_SAVED_PREVIEW"
      ) {
        return {
          ok: true,
          preview: {
            id: "pv-apply",
            name: "Saved Preview",
            status: "active",
            target: {
              origin: "https://example.com",
              pathname: "/",
              matchMode: "exact_path",
              canonicalUrl: "https://example.com/"
            },
            instances: [
              {
                id: "instance-1",
                componentId: "cmp-1",
                componentVersion: 1,
                placement: {
                  anchor: {
                    strategy: "selector",
                    primarySelector: "#host-1",
                    fallbackSelectors: []
                  },
                  insertionMode: "inside",
                  alignment: "start",
                  order: 1
                },
                render: { visible: true }
              },
              {
                id: "instance-2",
                componentId: "cmp-2",
                componentVersion: 1,
                placement: {
                  anchor: {
                    strategy: "selector",
                    primarySelector: "#host-2",
                    fallbackSelectors: []
                  },
                  insertionMode: "inside",
                  alignment: "start",
                  order: 2
                },
                render: { visible: true }
              }
            ],
            createdAt: "2026-03-30T12:00:00.000Z",
            updatedAt: "2026-03-30T12:00:00.000Z",
            revision: 1,
            schemaVersion: 1
          },
          components: [createComponent("cmp-1"), createComponent("cmp-2")]
        };
      }
      return undefined;
    });
    await loadRuntime();

    for (const listener of listeners) {
      listener({
        type: "APPLY_SAVED_PREVIEW",
        payload: {
          previewId: "pv-apply"
        }
      });
    }
    await flushWork();

    expect(firstHost.querySelector("[data-spectra-preview-id]")).not.toBeNull();
    expect(secondHost.querySelector("[data-spectra-preview-id]")).not.toBeNull();
    expect(document.querySelectorAll("[data-spectra-preview-id]")).toHaveLength(2);
  });

  it("applies placements using original anchors without selector drift", async () => {
    const parent = document.createElement("main");
    const firstHost = document.createElement("div");
    firstHost.id = "host-1";
    const secondHost = document.createElement("div");
    secondHost.id = "host-2";
    parent.append(firstHost, secondHost);
    document.body.appendChild(parent);

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        Reflect.get(message, "type") === "APPLY_SAVED_PREVIEW"
      ) {
        return {
          ok: true,
          preview: {
            id: "pv-order",
            name: "Saved Preview",
            status: "active",
            target: {
              origin: "https://example.com",
              pathname: "/",
              matchMode: "exact_path",
              canonicalUrl: "https://example.com/"
            },
            instances: [
              {
                id: "instance-1",
                componentId: "cmp-1",
                componentVersion: 1,
                placement: {
                  anchor: {
                    strategy: "selector",
                    primarySelector: "main > div:nth-of-type(1)",
                    fallbackSelectors: []
                  },
                  insertionMode: "before",
                  alignment: "start",
                  order: 1
                },
                render: { visible: true }
              },
              {
                id: "instance-2",
                componentId: "cmp-2",
                componentVersion: 1,
                placement: {
                  anchor: {
                    strategy: "selector",
                    primarySelector: "main > div:nth-of-type(2)",
                    fallbackSelectors: []
                  },
                  insertionMode: "before",
                  alignment: "start",
                  order: 2
                },
                render: { visible: true }
              }
            ],
            createdAt: "2026-03-30T12:00:00.000Z",
            updatedAt: "2026-03-30T12:00:00.000Z",
            revision: 1,
            schemaVersion: 1
          },
          components: [createComponent("cmp-1"), createComponent("cmp-2")]
        };
      }
      return undefined;
    });
    await loadRuntime();

    for (const listener of listeners) {
      listener({
        type: "APPLY_SAVED_PREVIEW",
        payload: {
          previewId: "pv-order"
        }
      });
    }
    await flushWork();

    expect(parent.children).toHaveLength(4);
    expect(parent.children[0]?.textContent).toContain("cmp-1");
    expect(parent.children[1]?.id).toBe("host-1");
    expect(parent.children[2]?.textContent).toContain("cmp-2");
    expect(parent.children[3]?.id).toBe("host-2");
  });

  it("counts fallback-applied instances as successful in the status message", async () => {
    const firstHost = createCandidateHost("host-1");
    const secondHost = createCandidateHost("host-2");

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        Reflect.get(message, "type") === "APPLY_SAVED_PREVIEW"
      ) {
        return {
          ok: true,
          preview: {
            id: "pv-fallback",
            name: "Saved Preview",
            status: "active",
            target: {
              origin: "https://example.com",
              pathname: "/",
              matchMode: "exact_path",
              canonicalUrl: "https://example.com/"
            },
            instances: [
              {
                id: "instance-1",
                componentId: "cmp-1",
                componentVersion: 1,
                placement: {
                  anchor: {
                    strategy: "selector",
                    primarySelector: "#host-1",
                    fallbackSelectors: []
                  },
                  insertionMode: "inside",
                  alignment: "start",
                  order: 1
                },
                render: { visible: true }
              },
              {
                id: "instance-2",
                componentId: "cmp-2",
                componentVersion: 1,
                placement: {
                  anchor: {
                    strategy: "selector",
                    primarySelector: "#missing-anchor",
                    fallbackSelectors: ["#host-2"]
                  },
                  insertionMode: "inside",
                  alignment: "start",
                  order: 2
                },
                render: { visible: true }
              }
            ],
            createdAt: "2026-03-30T12:00:00.000Z",
            updatedAt: "2026-03-30T12:00:00.000Z",
            revision: 1,
            schemaVersion: 1
          },
          components: [createComponent("cmp-1"), createComponent("cmp-2")]
        };
      }
      return undefined;
    });
    await loadRuntime();

    for (const listener of listeners) {
      listener({
        type: "APPLY_SAVED_PREVIEW",
        payload: {
          previewId: "pv-fallback"
        }
      });
    }
    await flushWork();

    expect(firstHost.querySelector("[data-spectra-preview-id]")).not.toBeNull();
    expect(secondHost.querySelector("[data-spectra-preview-id]")).not.toBeNull();
    expect(testState.toasts.at(-1)).toBe("Applied 2 component(s)");
  });
});

function isSavePreviewSceneMessage(message: unknown): message is {
  type: "SAVE_PREVIEW_SCENE";
  payload: {
    instances: Array<{
      layout?: {
        normalizedRect: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      };
    }>;
  };
} {
  if (!message || typeof message !== "object") {
    return false;
  }
  if (Reflect.get(message, "type") !== "SAVE_PREVIEW_SCENE") {
    return false;
  }
  const payload = Reflect.get(message, "payload");
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const instances = Reflect.get(payload, "instances");
  return Array.isArray(instances);
}
