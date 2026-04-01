import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { SavedPreviewListItem } from "../lib/library/types";
import { PreviewSessionToolbar } from "./PreviewSessionToolbar";

type ToolbarHandlers = {
  onSave: () => void;
  onLoadPreviews: () => void;
  onApplyPreview: (previewId: string) => void;
  onClearAll: () => void;
  onExit: () => void;
};

type ToolbarState = {
  previews: SavedPreviewListItem[];
  isBusy: boolean;
};

export type PreviewSessionToolbarControls = {
  mount: (host: HTMLElement) => void;
  update: (state: Partial<ToolbarState>) => void;
  show: () => void;
  hide: () => void;
  unmount: () => void;
};

export function createPreviewSessionToolbar(handlers: ToolbarHandlers): PreviewSessionToolbarControls {
  let root: Root | null = null;
  let hostElement: HTMLElement | null = null;
  let state: ToolbarState = {
    previews: [],
    isBusy: false
  };

  const render = (): void => {
    if (!hostElement) {
      return;
    }
    if (!root) {
      root = createRoot(hostElement);
    }
    root.render(
      createElement(PreviewSessionToolbar, {
        previews: state.previews,
        isBusy: state.isBusy,
        onSave: handlers.onSave,
        onLoadPreviews: handlers.onLoadPreviews,
        onApplyPreview: handlers.onApplyPreview,
        onClearAll: handlers.onClearAll,
        onExit: handlers.onExit
      })
    );
  };

  return {
    mount(host) {
      hostElement = host;
      host.style.bottom = "16px";
      host.style.left = "50%";
      host.style.transform = "translateX(-50%)";
      host.style.display = "none";
      host.style.zIndex = "2147483647";
      render();
    },
    update(nextState) {
      state = {
        ...state,
        ...nextState
      };
      render();
    },
    show() {
      if (hostElement) {
        hostElement.style.display = "block";
      }
    },
    hide() {
      if (hostElement) {
        hostElement.style.display = "none";
      }
    },
    unmount() {
      root?.unmount();
      root = null;
      if (hostElement) {
        hostElement.style.display = "none";
      }
      hostElement = null;
    }
  };
}
