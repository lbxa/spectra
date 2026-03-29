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
    "[data-component-picker-shortcuts='true']",
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
          cssText: expect.stringContaining(".sample"),
          bounds: expect.objectContaining({ width: 80, height: 32 }),
          sourceHostSignature: expect.objectContaining({
            hostTag: "button"
          })
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
