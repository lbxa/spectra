import type { InsertionRelation, PreviewAlignment } from "../lib/library/messages";
import { autoUpdate, computePosition, flip, offset, shift, type ComputePositionReturn } from "@floating-ui/dom";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PreviewToolbar, type MagicButtonState } from "./PreviewToolbar";

export type PreviewToolbarControls = {
  mount: (target: HTMLElement, relation: InsertionRelation, alignment: PreviewAlignment) => void;
  setMagicState: (state: MagicButtonState) => void;
  unmount: () => void;
};

export function createPreviewToolbar(
  handlers: {
    onUndo: () => void;
    onRetarget: () => void;
    onMagic: () => void;
    onRelationChange: (relation: InsertionRelation) => void;
    onAlignmentChange: (alignment: PreviewAlignment) => void;
  }
): PreviewToolbarControls {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.display = "none";
  host.style.pointerEvents = "auto";
  host.style.zIndex = "2147483647";
  const container = document.createElement("div");
  let root: Root | null = null;
  let cleanupAutoUpdate: (() => void) | null = null;
  let relation: InsertionRelation = "inside";
  let alignment: PreviewAlignment = "start";
  let magicState: MagicButtonState = "idle";

  const renderToolbar = (): void => {
    if (!root) {
      root = createRoot(container);
    }
    root.render(
      createElement(PreviewToolbar, {
        relation,
        alignment,
        onUndo: handlers.onUndo,
        onRetarget: handlers.onRetarget,
        onMagic: handlers.onMagic,
        magicState,
        onRelationChange: handlers.onRelationChange,
        onAlignmentChange: handlers.onAlignmentChange
      })
    );
  };

  return {
    mount(target, currentRelation, currentAlignment) {
      relation = currentRelation;
      alignment = currentAlignment;
      if (!host.isConnected) {
        document.documentElement.appendChild(host);
      }
      if (!container.isConnected) {
        host.appendChild(container);
      }
      renderToolbar();
      host.style.display = "block";

      const updatePosition = (): void => {
        void computePosition(target, host, {
          placement: "top",
          strategy: "fixed",
          middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 })]
        }).then(({ x, y }: ComputePositionReturn) => {
          host.style.left = `${Math.max(0, Math.round(x))}px`;
          host.style.top = `${Math.max(0, Math.round(y))}px`;
        });
      };

      cleanupAutoUpdate?.();
      cleanupAutoUpdate = autoUpdate(target, host, updatePosition);
      updatePosition();
    },
    setMagicState(state) {
      magicState = state;
      renderToolbar();
    },
    unmount() {
      cleanupAutoUpdate?.();
      cleanupAutoUpdate = null;
      root?.unmount();
      root = null;
      host.style.display = "none";
      container.remove();
      host.remove();
    }
  };
}
