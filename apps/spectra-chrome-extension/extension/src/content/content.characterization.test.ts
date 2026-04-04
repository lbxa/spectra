import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PICKER_GLOBAL_KEY = "__componentPickerSelectionState__";

function getChromeRuntime(): {
  sendMessage?: (message: unknown) => Promise<unknown>;
  getURL?: (path: string) => string;
} {
  const chromeValue = Reflect.get(globalThis, "chrome") as {
    runtime?: {
      sendMessage?: (message: unknown) => Promise<unknown>;
      getURL?: (path: string) => string;
    };
  };
  return chromeValue.runtime ?? {};
}

async function loadContentRuntime(): Promise<void> {
  vi.resetModules();
  await import("../content");
}

function createCaptureFixture(): { parent: HTMLElement; child: HTMLElement } {
  const parent = document.createElement("section");
  parent.id = "parent-target";
  parent.getBoundingClientRect = () => new DOMRect(10, 20, 300, 120);

  const child = document.createElement("button");
  child.id = "child-target";
  child.className = "sample";
  child.textContent = "capture";
  child.getBoundingClientRect = () => new DOMRect(24, 28, 80, 32);

  parent.appendChild(child);
  document.body.appendChild(parent);
  return { parent, child };
}

async function flushCaptureWork(): Promise<void> {
  await vi.advanceTimersByTimeAsync(300);
  await Promise.resolve();
}

async function advanceAndFlush(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await Promise.resolve();
}

function removeRuntimeArtifacts(): void {
  const selectors = [
    "[data-component-picker-ui-root='true']",
    "[data-component-picker-overlay='true']",
    "[data-component-picker-parent-overlay='true']",
    "[data-spectra-shortcuts-hud-root='true']",
    "[data-component-picker-toast='true']",
    "[data-component-picker-flash='true']",
    "[data-component-picker-capture-preview='true']"
  ];
  for (const selector of selectors) {
    for (const element of Array.from(document.querySelectorAll(selector))) {
      element.remove();
    }
  }
  Reflect.deleteProperty(window, PICKER_GLOBAL_KEY);
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  removeRuntimeArtifacts();
});

afterEach(() => {
  vi.clearAllTimers();
  removeRuntimeArtifacts();
  vi.useRealTimers();
});

describe("content.ts characterization", () => {
  it("injects picker overlays once and guards against reinjection", async () => {
    await loadContentRuntime();

    expect(document.querySelectorAll("[data-component-picker-overlay='true']")).toHaveLength(1);
    expect(document.querySelectorAll("[data-component-picker-parent-overlay='true']")).toHaveLength(1);
    expect(document.querySelectorAll("[data-component-picker-shortcuts='true']")).toHaveLength(1);

    await loadContentRuntime();

    expect(document.querySelectorAll("[data-component-picker-overlay='true']")).toHaveLength(1);
    expect(document.querySelector("[data-component-picker-toast='true']")?.textContent).toContain(
      "Capture mode is already active"
    );
  });

  it("escapes capture mode and cleans up runtime chrome", async () => {
    await loadContentRuntime();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await Promise.resolve();

    expect(document.querySelector("[data-component-picker-overlay='true']")).toBeNull();
    expect(document.querySelector("[data-component-picker-shortcuts='true']")).toBeNull();
    expect(document.querySelector("[data-component-picker-toast='true']")?.textContent).toContain("Capture cancelled");
    expect(Reflect.has(window, PICKER_GLOBAL_KEY)).toBe(false);
  });

  it("captures selected element, prevents click side effects, and sends SAVE_COMPONENT", async () => {
    const style = document.createElement("style");
    style.textContent = ".sample { color: rgb(255, 0, 0); }";
    document.head.appendChild(style);
    const { child } = createCaptureFixture();
    const bubbleSpy = vi.fn();
    document.addEventListener("click", bubbleSpy);

    const runtime = getChromeRuntime();
    const sendMessageSpy = vi.fn<(message: unknown) => Promise<{ ok: true; previewDataUrl: string }>>(async () => ({
      ok: true,
      previewDataUrl: "data:image/png;base64,abc"
    }));
    runtime.sendMessage = sendMessageSpy;

    await loadContentRuntime();

    const suppressibleEvents: Event[] = [
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      new MouseEvent("mouseup", { bubbles: true, cancelable: true }),
      new Event("dragstart", { bubbles: true, cancelable: true }),
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
      new Event("selectstart", { bubbles: true, cancelable: true })
    ];
    for (const event of suppressibleEvents) {
      child.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }

    const textNode = child.firstChild;
    if (!(textNode instanceof Text)) {
      throw new Error("Expected child text node");
    }
    const selectedRange = document.createRange();
    selectedRange.selectNodeContents(textNode);
    const selection = window.getSelection();
    if (!selection) {
      throw new Error("Expected browser selection API");
    }
    selection.removeAllRanges();
    selection.addRange(selectedRange);
    expect(selection.rangeCount).toBeGreaterThan(0);

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    child.dispatchEvent(click);
    await flushCaptureWork();

    expect(click.defaultPrevented).toBe(true);
    expect(bubbleSpy).not.toHaveBeenCalled();
    expect(sendMessageSpy).toHaveBeenCalledOnce();
    expect(sendMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SAVE_COMPONENT",
        payload: expect.objectContaining({
          html: expect.any(String),
          cssText: expect.stringContaining("/*__spectra_scoped_css_v1__*/"),
          bounds: expect.objectContaining({ width: 80, height: 32 }),
          sourceHostSignature: expect.objectContaining({
            hostTag: "button"
          })
        })
      })
    );
    expect(sendMessageSpy.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        payload: expect.objectContaining({
          cssText: expect.stringContaining('[data-spectra-capture-root="')
        })
      })
    );
    expect(window.getSelection()?.rangeCount ?? 0).toBe(0);
    expect(document.querySelector("[data-component-picker-toast='true']")?.textContent).toContain("Component captured");
    expect(document.querySelector("[data-component-picker-capture-preview='true']")).not.toBeNull();
    expect(document.querySelector("[data-component-picker-flash='true']")).not.toBeNull();

    const postCaptureMouseDown = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    child.dispatchEvent(postCaptureMouseDown);
    expect(postCaptureMouseDown.defaultPrevented).toBe(false);
  });

  it("plays optimistic jingle and delays flash until save resolves", async () => {
    const { child } = createCaptureFixture();
    const runtime = getChromeRuntime();
    let resolveSaveResponse: ((value: { ok: true }) => void) | null = null;
    runtime.sendMessage = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveSaveResponse = resolve;
        })
    );
    runtime.getURL = (path) => `chrome-extension://test/${path}`;

    const originalAudio = globalThis.Audio;
    const playSpy = vi.fn(async () => undefined);
    const audioCtorSpy = vi.fn(function (this: { volume: number; play: () => Promise<void> }, _src: string) {
      this.volume = 1;
      this.play = playSpy;
    });
    Reflect.set(globalThis, "Audio", audioCtorSpy as unknown as typeof Audio);

    try {
      await loadContentRuntime();
      child.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await flushCaptureWork();

      expect(document.querySelector("[data-component-picker-flash='true']")).toBeNull();
      expect(document.querySelector("[data-component-picker-toast='true']")).toBeNull();
      const playedSources = audioCtorSpy.mock.calls.map(([source]) => String(source));
      expect(playedSources).toContain("chrome-extension://test/audio/jingle.wav");

      expect(resolveSaveResponse).not.toBeNull();
      resolveSaveResponse!({ ok: true });
      await flushCaptureWork();

      expect(document.querySelector("[data-component-picker-flash='true']")).not.toBeNull();
      expect(document.querySelector("[data-component-picker-toast='true']")?.textContent).toContain("Component captured");
    } finally {
      Reflect.set(globalThis, "Audio", originalAudio);
    }
  });

  it("removes success toast after visible and transition durations", async () => {
    const { child } = createCaptureFixture();
    const runtime = getChromeRuntime();
    runtime.sendMessage = vi.fn(async () => ({ ok: true }));

    await loadContentRuntime();

    child.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushCaptureWork();
    expect(document.querySelector("[data-component-picker-toast='true']")).not.toBeNull();

    await advanceAndFlush(2200);
    expect(document.querySelector("[data-component-picker-toast='true']")).toBeNull();
  });

  it("removes preview thumbnail after its hold period", async () => {
    const { child } = createCaptureFixture();
    const runtime = getChromeRuntime();
    runtime.sendMessage = vi.fn(async () => ({ ok: true, previewDataUrl: "data:image/png;base64,preview" }));

    await loadContentRuntime();

    child.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushCaptureWork();
    expect(document.querySelector("[data-component-picker-capture-preview='true']")).not.toBeNull();

    await advanceAndFlush(3600);
    expect(document.querySelector("[data-component-picker-capture-preview='true']")).toBeNull();
  });

  it("uses the parent target when shift-clicking", async () => {
    const { parent, child } = createCaptureFixture();
    const nestedStyle = document.createElement("style");
    nestedStyle.textContent = ".nested-style-target { color: blue; }";
    parent.appendChild(nestedStyle);
    const runtime = getChromeRuntime();
    const sendMessageSpy = vi.fn<(message: unknown) => Promise<{ ok: true }>>(async () => ({ ok: true }));
    runtime.sendMessage = sendMessageSpy;

    await loadContentRuntime();

    child.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }));
    await flushCaptureWork();

    const [firstCallArg] = sendMessageSpy.mock.calls[0] ?? [];
    if (!firstCallArg || typeof firstCallArg !== "object") {
      throw new Error("Expected SAVE_COMPONENT payload");
    }
    const payload = Reflect.get(firstCallArg, "payload");
    if (!payload || typeof payload !== "object") {
      throw new Error("Expected payload object");
    }
    const html = Reflect.get(payload, "html");
    expect(typeof html).toBe("string");
    expect(html).toContain(`<section id="${parent.id}"`);
    expect(html).toContain(`id="${child.id}"`);
    expect(html).not.toContain("<style style=");
  });

  it("clips capture bounds to the visible viewport before sending SAVE_COMPONENT", async () => {
    const runtime = getChromeRuntime();
    const sendMessageSpy = vi.fn<(message: unknown) => Promise<{ ok: true }>>(async () => ({ ok: true }));
    runtime.sendMessage = sendMessageSpy;

    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { value: 100, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 100, configurable: true });

    const target = document.createElement("div");
    target.textContent = "off-screen target";
    target.getBoundingClientRect = () => new DOMRect(-20, 10, 40, 120);
    document.body.appendChild(target);

    try {
      await loadContentRuntime();
      target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await flushCaptureWork();
    } finally {
      Object.defineProperty(window, "innerWidth", { value: originalInnerWidth, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: originalInnerHeight, configurable: true });
    }

    expect(sendMessageSpy).toHaveBeenCalledOnce();
    expect(sendMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SAVE_COMPONENT",
        payload: expect.objectContaining({
          bounds: {
            left: 0,
            top: 10,
            width: 20,
            height: 90
          }
        })
      })
    );
  });

  it.each([
    ["Extension runtime unavailable", "Extension runtime unavailable. Reload the extension, then refresh this tab"],
    ["Snapshot too large to save", "Snapshot too large. Select a smaller element"],
    ["random failure", "Capture failed"]
  ])("maps capture errors to user-facing toast copy (%s)", async (errorMessage, expectedToast) => {
    const { child } = createCaptureFixture();
    const runtime = getChromeRuntime();
    runtime.sendMessage = vi.fn(async () => ({ ok: false, error: errorMessage }));

    await loadContentRuntime();

    child.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushCaptureWork();

    expect(document.querySelector("[data-component-picker-toast='true']")?.textContent).toContain(expectedToast);
  });

  it("plays error jingle when optimistic capture fails", async () => {
    const { child } = createCaptureFixture();
    const runtime = getChromeRuntime();
    runtime.sendMessage = vi.fn(async () => ({ ok: false, error: "random failure" }));
    runtime.getURL = (path) => `chrome-extension://test/${path}`;

    const originalAudio = globalThis.Audio;
    const playSpy = vi.fn(async () => undefined);
    const audioCtorSpy = vi.fn(function (this: { volume: number; play: () => Promise<void> }, _src: string) {
      this.volume = 1;
      this.play = playSpy;
    });
    Reflect.set(globalThis, "Audio", audioCtorSpy as unknown as typeof Audio);

    try {
      await loadContentRuntime();
      child.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await flushCaptureWork();

      const playedSources = audioCtorSpy.mock.calls.map(([source]) => String(source));
      expect(playedSources).toContain("chrome-extension://test/audio/jingle.wav");
      expect(playedSources).toContain("chrome-extension://test/audio/error.wav");
      expect(document.querySelector("[data-component-picker-toast='true']")?.textContent).toContain("Capture failed");
    } finally {
      Reflect.set(globalThis, "Audio", originalAudio);
    }
  });

  it("toggles parent overlay visibility when shift is pressed while hovering", async () => {
    const { child } = createCaptureFixture();
    await loadContentRuntime();

    child.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    const parentOverlay = document.querySelector("[data-component-picker-parent-overlay='true']");
    if (!(parentOverlay instanceof HTMLElement)) {
      throw new Error("Expected parent overlay element");
    }
    expect(parentOverlay.style.display).toBe("none");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true }));
    expect(parentOverlay.style.display).toBe("block");

    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", bubbles: true }));
    expect(parentOverlay.style.display).toBe("none");
  });

  it("keeps zero border widths when border style is solid", async () => {
    const target = document.createElement("button");
    target.className = "border-zero-case";
    target.textContent = "icon host";
    document.body.appendChild(target);

    const style = document.createElement("style");
    style.textContent = `.border-zero-case { border-style: solid; border-width: 0; border-color: rgb(0, 0, 0); }`;
    document.head.appendChild(style);

    const runtime = getChromeRuntime();
    const sendMessageSpy = vi.fn<(message: unknown) => Promise<{ ok: true }>>(async () => ({ ok: true }));
    runtime.sendMessage = sendMessageSpy;

    await loadContentRuntime();
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushCaptureWork();

    const [firstCallArg] = sendMessageSpy.mock.calls[0] ?? [];
    if (!firstCallArg || typeof firstCallArg !== "object") {
      throw new Error("Expected SAVE_COMPONENT payload");
    }
    const payload = Reflect.get(firstCallArg, "payload");
    if (!payload || typeof payload !== "object") {
      throw new Error("Expected payload object");
    }
    const html = Reflect.get(payload, "html");
    if (typeof html !== "string") {
      throw new Error("Expected captured html string");
    }

    expect(html).toContain("border-width: 0px");
  });

  it("keeps explicit zero spacing used by icon buttons", async () => {
    const target = document.createElement("button");
    target.className = "icon-align-case";
    target.textContent = "icon";
    document.body.appendChild(target);

    const style = document.createElement("style");
    style.textContent = `.icon-align-case { margin: 0; padding: 0; line-height: 1; }`;
    document.head.appendChild(style);

    const runtime = getChromeRuntime();
    const sendMessageSpy = vi.fn<(message: unknown) => Promise<{ ok: true }>>(async () => ({ ok: true }));
    runtime.sendMessage = sendMessageSpy;

    await loadContentRuntime();
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushCaptureWork();

    const [firstCallArg] = sendMessageSpy.mock.calls[0] ?? [];
    if (!firstCallArg || typeof firstCallArg !== "object") {
      throw new Error("Expected SAVE_COMPONENT payload");
    }
    const payload = Reflect.get(firstCallArg, "payload");
    if (!payload || typeof payload !== "object") {
      throw new Error("Expected payload object");
    }
    const html = Reflect.get(payload, "html");
    if (typeof html !== "string") {
      throw new Error("Expected captured html string");
    }

    expect(html).toContain("margin: 0px");
    expect(html).toContain("padding: 0px");
  });

  it("keeps protected default typography values when explicitly authored", async () => {
    const target = document.createElement("div");
    target.className = "typography-default-case";
    target.textContent = "Typography";
    document.body.appendChild(target);

    const style = document.createElement("style");
    style.textContent = `.typography-default-case { text-transform: none; letter-spacing: normal; text-align: start; }`;
    document.head.appendChild(style);

    const runtime = getChromeRuntime();
    const sendMessageSpy = vi.fn<(message: unknown) => Promise<{ ok: true }>>(async () => ({ ok: true }));
    runtime.sendMessage = sendMessageSpy;

    await loadContentRuntime();
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushCaptureWork();

    const [firstCallArg] = sendMessageSpy.mock.calls[0] ?? [];
    if (!firstCallArg || typeof firstCallArg !== "object") {
      throw new Error("Expected SAVE_COMPONENT payload");
    }
    const payload = Reflect.get(firstCallArg, "payload");
    if (!payload || typeof payload !== "object") {
      throw new Error("Expected payload object");
    }
    const html = Reflect.get(payload, "html");
    if (typeof html !== "string") {
      throw new Error("Expected captured html string");
    }

    expect(html).toContain("text-transform: none");
    expect(html).toContain("letter-spacing: normal");
  });

  it("keeps protected default overflow and interaction values", async () => {
    const target = document.createElement("div");
    target.className = "interaction-default-case";
    target.textContent = "Interaction";
    document.body.appendChild(target);

    const style = document.createElement("style");
    style.textContent = `.interaction-default-case { overflow: visible; pointer-events: auto; user-select: auto; }`;
    document.head.appendChild(style);

    const runtime = getChromeRuntime();
    const sendMessageSpy = vi.fn<(message: unknown) => Promise<{ ok: true }>>(async () => ({ ok: true }));
    runtime.sendMessage = sendMessageSpy;

    await loadContentRuntime();
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushCaptureWork();

    const [firstCallArg] = sendMessageSpy.mock.calls[0] ?? [];
    if (!firstCallArg || typeof firstCallArg !== "object") {
      throw new Error("Expected SAVE_COMPONENT payload");
    }
    const payload = Reflect.get(firstCallArg, "payload");
    if (!payload || typeof payload !== "object") {
      throw new Error("Expected payload object");
    }
    const html = Reflect.get(payload, "html");
    if (typeof html !== "string") {
      throw new Error("Expected captured html string");
    }

    expect(html).toContain("overflow: visible");
    expect(html).toContain("pointer-events: auto");
    expect(html).toContain("user-select: auto");
  });

  it("keeps protected default appearance values", async () => {
    const target = document.createElement("button");
    target.className = "appearance-default-case";
    target.textContent = "Button";
    document.body.appendChild(target);

    const style = document.createElement("style");
    style.textContent = `.appearance-default-case { appearance: none; }`;
    document.head.appendChild(style);

    const runtime = getChromeRuntime();
    const sendMessageSpy = vi.fn<(message: unknown) => Promise<{ ok: true }>>(async () => ({ ok: true }));
    runtime.sendMessage = sendMessageSpy;

    await loadContentRuntime();
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushCaptureWork();

    const [firstCallArg] = sendMessageSpy.mock.calls[0] ?? [];
    if (!firstCallArg || typeof firstCallArg !== "object") {
      throw new Error("Expected SAVE_COMPONENT payload");
    }
    const payload = Reflect.get(firstCallArg, "payload");
    if (!payload || typeof payload !== "object") {
      throw new Error("Expected payload object");
    }
    const html = Reflect.get(payload, "html");
    if (typeof html !== "string") {
      throw new Error("Expected captured html string");
    }

    expect(html).toContain("appearance: none");
  });

  it("keeps protected default SVG geometry values", async () => {
    const target = document.createElement("svg");
    target.classList.add("svg-default-case");
    target.setAttribute("viewBox", "0 0 16 16");
    target.innerHTML = `<path d="M1 1L15 15" />`;
    document.body.appendChild(target);

    const style = document.createElement("style");
    style.textContent = `.svg-default-case path { stroke: rgb(0, 0, 0); stroke-width: 1px; stroke-linecap: butt; stroke-linejoin: miter; stroke-opacity: 1; fill-opacity: 1; }`;
    document.head.appendChild(style);

    const runtime = getChromeRuntime();
    const sendMessageSpy = vi.fn<(message: unknown) => Promise<{ ok: true }>>(async () => ({ ok: true }));
    runtime.sendMessage = sendMessageSpy;

    await loadContentRuntime();
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushCaptureWork();

    const [firstCallArg] = sendMessageSpy.mock.calls[0] ?? [];
    if (!firstCallArg || typeof firstCallArg !== "object") {
      throw new Error("Expected SAVE_COMPONENT payload");
    }
    const payload = Reflect.get(firstCallArg, "payload");
    if (!payload || typeof payload !== "object") {
      throw new Error("Expected payload object");
    }
    const html = Reflect.get(payload, "html");
    if (typeof html !== "string") {
      throw new Error("Expected captured html string");
    }

    expect(html).toContain("stroke-width: 1px");
    expect(html).toContain("stroke-linecap: butt");
    expect(html).toContain("stroke-linejoin: miter");
    expect(html).toContain("stroke-opacity: 1");
    expect(html).toContain("fill-opacity: 1");
  });

  it("updates the shift shortcut key visual state", async () => {
    await loadContentRuntime();

    const panel = document.querySelector("[data-component-picker-shortcuts='true']");
    if (!(panel instanceof HTMLElement)) {
      throw new Error("Expected shortcuts panel");
    }

    const shiftKey = Array.from(panel.querySelectorAll("span")).find((node) => node.textContent === "Shift");
    if (!(shiftKey instanceof HTMLElement)) {
      throw new Error("Expected Shift shortcut key");
    }

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true }));
    expect(shiftKey.style.borderColor).toContain("217, 70, 239");

    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", bubbles: true }));
    expect(shiftKey.style.borderColor).toContain("148, 163, 184");
  });
});
