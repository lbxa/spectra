import { getCaptureFailureMessage } from "./content/capture-runtime-bridge";
import { buildStandaloneSnapshot as buildCaptureSnapshot } from "./content/capture/snapshot-builder";
import {
  clampBoundsToVisibleViewport as clampToVisibleViewport,
  clearDocumentSelection as clearSelectionRanges,
  installCaptureInteractionGuards as installSelectionGuards,
  resolveSelectedTarget as resolveSelectionTarget,
  waitForPostCleanupPaint as waitForCleanupPaint
} from "./content/capture/selection-runtime";
import { createPickerUi, type PickerUiApi } from "./content/picker-ui/PickerUiRoot";
import {
  createShortcutsHud,
  type ShortcutsHudApi
} from "./content/picker-ui/ShortcutsHud";
import { playExtensionSound } from "./content/extension-audio";
import { createInteractionController } from "./content/targeting/interaction-controller";
import { applyRectLayerBounds, createRectLayer } from "./content/targeting/rect-layer";
import { syncParentOutlineForTarget } from "./content/targeting/parent-outline";
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
  shortcutsHud: ShortcutsHudApi;
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
  const ui = createPickerUi({ shortcutsEnabled: false });
  const shortcutsHud = createShortcutsHud();
  shortcutsHud.setVisible(true);
  const state: SelectionState = {
    overlay,
    parentOverlay,
    ui,
    shortcutsHud,
    lastHoveredElement: null,
    isDone: false
  };

  pickerWindow[globalKey] = state;
  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(parentOverlay);
  const interactionController = createInteractionController({
    isActive: () => !state.isDone,
    installGuards: installCaptureInteractionGuards,
    onHover: (_event, target, context) => {
      state.lastHoveredElement = target;
      updateOverlay(target.getBoundingClientRect());
      updateParentOverlayForTarget(target, context.isShiftHeld);
    },
    onCommit: (event, target, context) => {
      void handleCommit(event, target, context.isShiftHeld);
    },
    onCancel: () => {
      state.isDone = true;
      cleanup();
      state.ui.showToast("Capture cancelled");
      state.ui.destroyAfter(2500);
    },
    onModifierChange: ({ isShiftHeld }) => {
      refreshParentOverlay(isShiftHeld);
      state.shortcutsHud.setShiftActive(isShiftHeld);
    }
  });
  interactionController.start();

  async function handleCommit(event: MouseEvent, target: Element, isShiftHeld: boolean): Promise<void> {
    state.lastHoveredElement = target;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void playExtensionSound("click.wav");

    state.isDone = true;
    cleanup();
    await waitForPostCleanupPaint();

    const selectedTarget = resolveSelectedTarget(target, isShiftHeld);
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
      void playExtensionSound("jingle.wav");
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
      void playExtensionSound("error.wav");
      state.ui.showToast(getCaptureFailureMessage(error));
      state.ui.destroyAfter(2500);
    }
  }

  function cleanup(): void {
    interactionController.stop();
    overlay.remove();
    parentOverlay.remove();
    state.shortcutsHud.destroy();
    delete pickerWindow[globalKey];
  }

  function updateOverlay(rect: DOMRect): void {
    applyRectLayerBounds(overlay, rect, { minWidth: 0, minHeight: 0 });
  }

  function updateParentOverlayForTarget(target: Element, isShiftHeld: boolean): void {
    syncParentOutlineForTarget(parentOverlay, target, isShiftHeld);
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
  const overlay = createRectLayer({
    border: "2px solid #2563eb",
    background: "rgba(37, 99, 235, 0.12)",
    borderRadius: "4px",
    zIndex: "2147483647"
  });
  overlay.setAttribute("data-component-picker-overlay", "true");
  return overlay;
}

function createParentOverlay(): HTMLDivElement {
  const overlay = createRectLayer({
    border: "2px solid #d946ef",
    background: "rgba(217, 70, 239, 0.1)",
    borderRadius: "4px",
    zIndex: "2147483646"
  });
  overlay.setAttribute("data-component-picker-parent-overlay", "true");
  return overlay;
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
