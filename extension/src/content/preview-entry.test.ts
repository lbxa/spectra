import type { SavedComponent } from "../lib/library/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  insertCount: 0,
  candidate: null as {
    element: HTMLElement;
    rect: DOMRect;
    signature: SavedComponent["sourceHostSignature"];
  } | null,
  watchCallbacks: new Map<string, () => void>()
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
    const selectedOutline = document.createElement("div");
    const ghost = document.createElement("div");
    const label = document.createElement("div");
    const controlsHost = document.createElement("div");
    document.body.appendChild(root);
    return {
      root,
      hoverOutline,
      selectedOutline,
      ghost,
      label,
      controlsHost,
      showToast: vi.fn(),
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
});
