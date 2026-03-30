import { getCaptureFailureMessage } from "./content/capture-runtime-bridge";
import { buildStandaloneSnapshot as buildCaptureSnapshot } from "./content/capture/snapshot-builder";
import {
  clampBoundsToVisibleViewport as clampToVisibleViewport,
  clearDocumentSelection as clearSelectionRanges,
  installCaptureInteractionGuards as installSelectionGuards,
  resolveParentTarget as resolveSelectionParentTarget,
  resolveSelectedTarget as resolveSelectionTarget,
  waitForPostCleanupPaint as waitForCleanupPaint
} from "./content/capture/selection-runtime";
import { createPickerUi, type PickerUiApi } from "./content/picker-ui/PickerUiRoot";
import type {
  Bounds,
  SaveComponentMessage,
  SaveComponentPayload,
  SaveComponentResponse
} from "./lib/library/messages";
import { computeHostSignature } from "./lib/preview/host-signature";

(() => {
type SelectionState = {
  overlay: HTMLDivElement;
  parentOverlay: HTMLDivElement;
  ui: PickerUiApi;
  lastHoveredElement: Element | null;
  isDone: boolean;
};

type PickerWindow = Window & {
  __componentPickerSelectionState__?: SelectionState;
};

(() => {
  const pickerWindow = window as PickerWindow;
  const globalKey = "__componentPickerSelectionState__";

  if (pickerWindow[globalKey]) {
    pickerWindow[globalKey]?.ui.showToast("Capture mode is already active");
    return;
  }

  const overlay = createOverlay();
  const parentOverlay = createParentOverlay();
  const ui = createPickerUi();
  const state: SelectionState = {
    overlay,
    parentOverlay,
    ui,
    lastHoveredElement: null,
    isDone: false
  };

  pickerWindow[globalKey] = state;
  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(parentOverlay);
  const teardownCaptureInteractionGuards = installCaptureInteractionGuards(() => state.isDone);

  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);

  function onMouseMove(event: MouseEvent): void {
    if (state.isDone) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    state.lastHoveredElement = target;
    updateOverlay(target.getBoundingClientRect());
    updateParentOverlayForTarget(target, event.shiftKey);
  }

  async function onClick(event: MouseEvent): Promise<void> {
    if (state.isDone) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void playSound("click.wav");

    state.isDone = true;
    cleanup();
    await waitForPostCleanupPaint();

    const selectedTarget = resolveSelectedTarget(target, event.shiftKey);
    clearDocumentSelection();
    const rect = selectedTarget.getBoundingClientRect();
    const captureBounds = clampBoundsToVisibleViewport(rect);
    const snapshot = buildStandaloneSnapshot(selectedTarget);
    const payload: SaveComponentPayload = {
      html: snapshot.html,
      cssText: snapshot.cssText,
      url: window.location.href,
      title: document.title || "",
      bounds: {
        left: captureBounds.left,
        top: captureBounds.top,
        width: captureBounds.width,
        height: captureBounds.height
      },
      devicePixelRatio: window.devicePixelRatio || 1,
      sourceHostSignature: computeLocalHostSignature(selectedTarget)
    };

    try {
      const saveRequest = sendRuntimeMessage({
        type: "SAVE_COMPONENT",
        payload
      } satisfies SaveComponentMessage);
      void playSound("jingle.wav");
      const response = (await saveRequest) as SaveComponentResponse;

      if (!response?.ok) {
        throw new Error(response?.error || "Capture failed");
      }
      state.ui.showFlash();
      if (response.previewDataUrl) {
        state.ui.showPreview(response.previewDataUrl);
      }
      state.ui.showToast("Component captured");
      state.ui.destroyAfter(4000);
    } catch (error) {
      console.error("Failed to capture component:", error);
      void playSound("error.wav");
      state.ui.showToast(getCaptureFailureMessage(error));
      state.ui.destroyAfter(2500);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      state.isDone = true;
      cleanup();
      state.ui.showToast("Capture cancelled");
      state.ui.destroyAfter(2500);
      return;
    }
    if (event.key === "Shift") {
      refreshParentOverlay(true);
      state.ui.setShiftActive(true);
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (event.key === "Shift") {
      refreshParentOverlay(false);
      state.ui.setShiftActive(false);
    }
  }

  function cleanup(): void {
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    teardownCaptureInteractionGuards();
    overlay.remove();
    parentOverlay.remove();
    state.ui.setShortcutsVisible(false);
    delete pickerWindow[globalKey];
  }

  function updateOverlay(rect: DOMRect): void {
    overlay.style.display = "block";
    overlay.style.left = `${Math.max(0, rect.left)}px`;
    overlay.style.top = `${Math.max(0, rect.top)}px`;
    overlay.style.width = `${Math.max(0, rect.width)}px`;
    overlay.style.height = `${Math.max(0, rect.height)}px`;
  }

  function updateParentOverlayForTarget(target: Element, isShiftHeld: boolean): void {
    if (!isShiftHeld) {
      parentOverlay.style.display = "none";
      return;
    }
    const parentTarget = resolveParentTarget(target);
    if (!parentTarget) {
      parentOverlay.style.display = "none";
      return;
    }
    const rect = parentTarget.getBoundingClientRect();
    parentOverlay.style.display = "block";
    parentOverlay.style.left = `${Math.max(0, rect.left)}px`;
    parentOverlay.style.top = `${Math.max(0, rect.top)}px`;
    parentOverlay.style.width = `${Math.max(0, rect.width)}px`;
    parentOverlay.style.height = `${Math.max(0, rect.height)}px`;
  }

  function refreshParentOverlay(isShiftHeld: boolean): void {
    if (!state.lastHoveredElement) {
      parentOverlay.style.display = "none";
      return;
    }
    updateParentOverlayForTarget(state.lastHoveredElement, isShiftHeld);
  }
})();

function resolveSelectedTarget(target: Element, isShiftHeld: boolean): Element {
  return resolveSelectionTarget(target, isShiftHeld);
}

function resolveParentTarget(target: Element): Element | null {
  return resolveSelectionParentTarget(target);
}

function installCaptureInteractionGuards(isDone: () => boolean): () => void {
  return installSelectionGuards(isDone);
}

function clearDocumentSelection(): void {
  clearSelectionRanges();
}

function clampBoundsToVisibleViewport(rect: DOMRect): Bounds {
  return clampToVisibleViewport(rect);
}

function buildStandaloneSnapshot(target: Element): {
  html: string;
  cssText: string;
} {
  return buildCaptureSnapshot(target);
}

function computeLocalHostSignature(element: Element): SaveComponentPayload["sourceHostSignature"] {
  return computeHostSignature(element);
}

function createOverlay(): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-component-picker-overlay", "true");
  overlay.style.position = "fixed";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "2147483647";
  overlay.style.border = "2px solid #2563eb";
  overlay.style.background = "rgba(37, 99, 235, 0.12)";
  overlay.style.borderRadius = "4px";
  overlay.style.boxSizing = "border-box";
  overlay.style.transition = "all 0.03s linear";
  overlay.style.display = "none";
  return overlay;
}

function createParentOverlay(): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-component-picker-parent-overlay", "true");
  overlay.style.position = "fixed";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "2147483646";
  overlay.style.border = "2px solid #d946ef";
  overlay.style.background = "rgba(217, 70, 239, 0.1)";
  overlay.style.borderRadius = "4px";
  overlay.style.boxSizing = "border-box";
  overlay.style.transition = "all 0.03s linear";
  overlay.style.display = "none";
  return overlay;
}

async function playSound(fileName: "click.wav" | "jingle.wav" | "error.wav"): Promise<void> {
  const runtime = globalThis.chrome?.runtime;
  if (!runtime || typeof runtime.getURL !== "function") {
    return;
  }

  try {
    const audio = new Audio(runtime.getURL(`audio/${fileName}`));
    audio.volume = 0.5;
    await audio.play();
  } catch {
    // Ignore blocked autoplay and missing codec failures.
  }
}

async function sendRuntimeMessage(message: SaveComponentMessage): Promise<unknown> {
  const runtime = globalThis.chrome?.runtime;
  if (!runtime || typeof runtime.sendMessage !== "function") {
    throw new Error("Extension runtime unavailable");
  }
  return runtime.sendMessage(message);
}

async function waitForPostCleanupPaint(): Promise<void> {
  await waitForCleanupPaint();
}
})();
