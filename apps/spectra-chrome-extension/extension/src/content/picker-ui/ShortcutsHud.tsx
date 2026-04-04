import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { ShortcutsCard } from "./ShortcutsCard";

type ShortcutsHudState = {
  visible: boolean;
  shiftActive: boolean;
};

export type ShortcutsHudApi = {
  setVisible: (visible: boolean) => void;
  setShiftActive: (isActive: boolean) => void;
  destroy: () => void;
};

export function createShortcutsHud(options?: { escapeDescription?: string }): ShortcutsHudApi {
  const container = document.createElement("div");
  container.setAttribute("data-spectra-shortcuts-hud-root", "true");
  document.documentElement.appendChild(container);
  const root: Root = createRoot(container);
  let isDestroyed = false;
  const state: ShortcutsHudState = {
    visible: false,
    shiftActive: false
  };

  const render = (): void => {
    if (isDestroyed) {
      return;
    }
    flushSync(() => {
      root.render(
        state.visible ? (
          <ShortcutsCard
            shiftActive={state.shiftActive}
            escapeDescription={options?.escapeDescription}
          />
        ) : null
      );
    });
  };

  const api: ShortcutsHudApi = {
    setVisible(visible) {
      state.visible = visible;
      render();
    },
    setShiftActive(isActive) {
      state.shiftActive = isActive;
      render();
    },
    destroy() {
      if (isDestroyed) {
        return;
      }
      isDestroyed = true;
      flushSync(() => {
        root.unmount();
      });
      container.remove();
    }
  };

  render();
  return api;
}
