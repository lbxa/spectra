import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPickerUi } from "./PickerUiRoot";

async function flushUi(): Promise<void> {
  await Promise.resolve();
}

function cleanupPickerUiArtifacts(): void {
  const selectors = [
    "[data-component-picker-ui-root='true']",
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
}

describe("createPickerUi", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    cleanupPickerUiArtifacts();
  });

  afterEach(() => {
    cleanupPickerUiArtifacts();
    vi.useRealTimers();
  });

  it("renders shortcuts panel and toggles shift key visuals", async () => {
    const ui = createPickerUi();
    await flushUi();
    const panel = document.querySelector("[data-component-picker-shortcuts='true']");
    expect(panel).not.toBeNull();

    const shiftKey = Array.from(panel?.querySelectorAll("span") ?? []).find((node) => node.textContent === "Shift");
    if (!(shiftKey instanceof HTMLElement)) {
      throw new Error("Expected Shift key");
    }

    ui.setShiftActive(true);
    await flushUi();
    expect(shiftKey.style.borderColor).toContain("217, 70, 239");

    ui.setShiftActive(false);
    await flushUi();
    expect(shiftKey.style.borderColor).toContain("148, 163, 184");
    ui.destroy();
  });

  it("shows and removes toast with timing", async () => {
    const ui = createPickerUi();
    ui.showToast("hello");
    await flushUi();
    const toast = document.querySelector("[data-component-picker-toast='true']");
    expect(toast?.textContent).toContain("hello");

    await vi.advanceTimersByTimeAsync(2200);
    await flushUi();
    expect(document.querySelector("[data-component-picker-toast='true']")).toBeNull();
    ui.destroy();
  });

  it("shows flash and preview then cleans them up", async () => {
    const ui = createPickerUi();
    ui.showFlash();
    ui.showPreview("data:image/png;base64,preview");
    await flushUi();

    expect(document.querySelector("[data-component-picker-flash='true']")).not.toBeNull();
    const preview = document.querySelector("[data-component-picker-capture-preview='true']");
    expect(preview).not.toBeNull();
    if (!(preview instanceof HTMLImageElement)) {
      throw new Error("Expected preview image");
    }
    expect(preview.style.width).toBe("auto");
    expect(preview.style.height).toBe("auto");
    expect(preview.style.maxWidth).toBe("120px");
    expect(preview.style.maxHeight).toBe("120px");
    expect(preview.style.objectFit).toBe("contain");

    await vi.advanceTimersByTimeAsync(4000);
    await flushUi();

    expect(document.querySelector("[data-component-picker-flash='true']")).toBeNull();
    expect(document.querySelector("[data-component-picker-capture-preview='true']")).toBeNull();
    ui.destroy();
  });

  it("destroys rendered ui container", () => {
    const ui = createPickerUi();
    ui.destroy();
    expect(document.querySelector("[data-component-picker-shortcuts='true']")).toBeNull();
  });
});
