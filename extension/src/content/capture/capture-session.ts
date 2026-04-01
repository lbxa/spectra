import { getCaptureFailureMessage } from "../capture-runtime-bridge";
import { buildStandaloneSnapshot } from "./snapshot-builder";
import {
  clampBoundsToVisibleViewport,
  clearDocumentSelection,
  installCaptureInteractionGuards,
  resolveSelectedTarget,
  waitForPostCleanupPaint
} from "./selection-runtime";
import { createPickerUi, type PickerUiApi } from "../picker-ui/PickerUiRoot";
import {
  createShortcutsHud,
  type ShortcutsHudApi
} from "../picker-ui/ShortcutsHud";
import { playExtensionSound } from "../extension-audio";
import { createInteractionController } from "../targeting/interaction-controller";
import { applyRectLayerBounds, createRectLayer } from "../targeting/rect-layer";
import { syncParentOutlineForTarget } from "../targeting/parent-outline";
import type {
  Bounds,
  SaveComponentMessage,
  SaveComponentPayload,
  SaveComponentResponse
} from "../../lib/library/messages";
import { computeHostSignature } from "../../lib/preview/host-signature";

export const CAPTURE_SESSION_GLOBAL_KEY = "__componentPickerSelectionState__";

type CaptureSessionState = {
  overlay: HTMLDivElement;
  parentOverlay: HTMLDivElement;
  ui: PickerUiApi;
  shortcutsHud: ShortcutsHudApi;
  lastHoveredElement: Element | null;
  isDone: boolean;
};

type PickerWindow = Window & {
  [CAPTURE_SESSION_GLOBAL_KEY]?: CaptureSessionState;
};

export function startCaptureSession(): void {
  const pickerWindow = window as PickerWindow;
  if (pickerWindow[CAPTURE_SESSION_GLOBAL_KEY]) {
    pickerWindow[CAPTURE_SESSION_GLOBAL_KEY]?.ui.showToast("Capture mode is already active");
    return;
  }

  const overlay = createOverlay();
  const parentOverlay = createParentOverlay();
  const ui = createPickerUi({ shortcutsEnabled: false });
  const shortcutsHud = createShortcutsHud();
  shortcutsHud.setVisible(true);

  const state: CaptureSessionState = {
    overlay,
    parentOverlay,
    ui,
    shortcutsHud,
    lastHoveredElement: null,
    isDone: false
  };

  pickerWindow[CAPTURE_SESSION_GLOBAL_KEY] = state;
  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(parentOverlay);

  const interactionController = createInteractionController({
    isActive: () => !state.isDone,
    installGuards: installCaptureInteractionGuards,
    onHover: (_event, target, context) => {
      state.lastHoveredElement = target;
      applyRectLayerBounds(state.overlay, target.getBoundingClientRect(), {
        minWidth: 0,
        minHeight: 0
      });
      syncParentOutlineForTarget(state.parentOverlay, target, context.isShiftHeld);
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
      if (!state.lastHoveredElement) {
        state.parentOverlay.style.display = "none";
      } else {
        syncParentOutlineForTarget(state.parentOverlay, state.lastHoveredElement, isShiftHeld);
      }
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
    const captureBounds: Bounds = clampBoundsToVisibleViewport(rect);
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
      sourceHostSignature: computeHostSignature(selectedTarget)
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
    state.overlay.remove();
    state.parentOverlay.remove();
    state.shortcutsHud.destroy();
    delete pickerWindow[CAPTURE_SESSION_GLOBAL_KEY];
  }
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
