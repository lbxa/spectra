import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { FeedbackLayer } from "./FeedbackLayer";
import { ShortcutsCard } from "./ShortcutsCard";
import { ToastLayer } from "./ToastLayer";

const TOAST_TRANSITION_MS = 220;
const TOAST_VISIBLE_MS = 1400;
const CAPTURE_FLASH_TRANSITION_MS = 250;
const CAPTURE_PREVIEW_ENTER_MS = 320;
const CAPTURE_PREVIEW_HOLD_MS = 2500;

type PickerUiState = {
  shortcutsVisible: boolean;
  shiftActive: boolean;
  toastMessage: string | null;
  toastVisible: boolean;
  flashMounted: boolean;
  flashVisible: boolean;
  previewDataUrl: string | null;
  previewVisible: boolean;
};

export type PickerUiApi = {
  setShortcutsVisible: (visible: boolean) => void;
  setShiftActive: (isActive: boolean) => void;
  showToast: (message: string) => void;
  showFlash: () => void;
  showPreview: (dataUrl: string) => void;
  destroyAfter: (delayMs: number) => void;
  destroy: () => void;
};

type PickerUiOptions = {
  shortcutsEnabled?: boolean;
};

export function createPickerUi(options: PickerUiOptions = {}): PickerUiApi {
  const shortcutsEnabled = options.shortcutsEnabled ?? true;
  const container = document.createElement("div");
  container.setAttribute("data-component-picker-ui-root", "true");
  document.documentElement.appendChild(container);
  const root = createRoot(container);

  const state: PickerUiState = {
    shortcutsVisible: shortcutsEnabled,
    shiftActive: false,
    toastMessage: null,
    toastVisible: false,
    flashMounted: false,
    flashVisible: false,
    previewDataUrl: null,
    previewVisible: false
  };

  const timers = new Set<number>();
  const animationFrames = new Set<number>();
  const toastTimers = new Set<number>();
  const flashTimers = new Set<number>();
  const previewTimers = new Set<number>();
  let isDestroyed = false;

  const scheduleTimeout = (fn: () => void, delayMs: number): number => {
    const timeoutId = window.setTimeout(() => {
      timers.delete(timeoutId);
      fn();
    }, delayMs);
    timers.add(timeoutId);
    return timeoutId;
  };

  const scheduleAnimationFrame = (fn: () => void): number => {
    const frameId = window.requestAnimationFrame(() => {
      animationFrames.delete(frameId);
      fn();
    });
    animationFrames.add(frameId);
    return frameId;
  };

  const clearTimerGroup = (group: Set<number>): void => {
    for (const timerId of group) {
      window.clearTimeout(timerId);
      timers.delete(timerId);
    }
    group.clear();
  };

  const render = (): void => {
    if (isDestroyed) {
      return;
    }
    flushSync(() => {
      root.render(
        <>
          {shortcutsEnabled && state.shortcutsVisible ? <ShortcutsCard shiftActive={state.shiftActive} /> : null}
          <ToastLayer message={state.toastMessage} visible={state.toastVisible} />
          <FeedbackLayer
            flashMounted={state.flashMounted}
            flashVisible={state.flashVisible}
            previewDataUrl={state.previewDataUrl}
            previewVisible={state.previewVisible}
          />
        </>
      );
    });
  };

  const api: PickerUiApi = {
    setShortcutsVisible(visible) {
      state.shortcutsVisible = visible;
      render();
    },
    setShiftActive(isActive) {
      state.shiftActive = isActive;
      render();
    },
    showToast(message) {
      clearTimerGroup(toastTimers);
      state.toastMessage = message;
      state.toastVisible = false;
      render();

      scheduleAnimationFrame(() => {
        state.toastVisible = true;
        render();
      });

      const hideTimer = scheduleTimeout(() => {
        state.toastVisible = false;
        render();
        const removeTimer = scheduleTimeout(() => {
          state.toastMessage = null;
          render();
          toastTimers.delete(removeTimer);
        }, TOAST_TRANSITION_MS);
        toastTimers.add(removeTimer);
        toastTimers.delete(hideTimer);
      }, TOAST_VISIBLE_MS);
      toastTimers.add(hideTimer);
    },
    showFlash() {
      clearTimerGroup(flashTimers);
      state.flashMounted = true;
      state.flashVisible = true;
      render();

      scheduleAnimationFrame(() => {
        state.flashVisible = false;
        render();
      });

      const removeTimer = scheduleTimeout(() => {
        state.flashMounted = false;
        render();
        flashTimers.delete(removeTimer);
      }, CAPTURE_FLASH_TRANSITION_MS + 100);
      flashTimers.add(removeTimer);
    },
    showPreview(dataUrl) {
      clearTimerGroup(previewTimers);
      state.previewDataUrl = dataUrl;
      state.previewVisible = false;
      render();

      scheduleAnimationFrame(() => {
        state.previewVisible = true;
        render();
      });

      const hideTimer = scheduleTimeout(() => {
        state.previewVisible = false;
        render();
        const removeTimer = scheduleTimeout(() => {
          state.previewDataUrl = null;
          render();
          previewTimers.delete(removeTimer);
        }, CAPTURE_PREVIEW_ENTER_MS);
        previewTimers.add(removeTimer);
        previewTimers.delete(hideTimer);
      }, CAPTURE_PREVIEW_HOLD_MS);
      previewTimers.add(hideTimer);
    },
    destroyAfter(delayMs) {
      const destroyTimer = scheduleTimeout(() => {
        api.destroy();
      }, delayMs);
      previewTimers.add(destroyTimer);
    },
    destroy() {
      if (isDestroyed) {
        return;
      }
      isDestroyed = true;
      clearTimerGroup(toastTimers);
      clearTimerGroup(flashTimers);
      clearTimerGroup(previewTimers);
      for (const timerId of timers) {
        window.clearTimeout(timerId);
      }
      timers.clear();
      for (const frameId of animationFrames) {
        window.cancelAnimationFrame(frameId);
      }
      animationFrames.clear();
      flushSync(() => {
        root.unmount();
      });
      container.remove();
    }
  };

  render();
  return api;
}
