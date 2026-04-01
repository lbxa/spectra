import type { InsertionRelation, PreviewAlignment } from "../lib/library/messages";
import { autoUpdate, computePosition, flip, offset, shift, type ComputePositionReturn } from "@floating-ui/dom";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PreviewToolbar } from "./PreviewToolbar";

export type PreviewToolbarControls = {
  update: (state: {
    relation: InsertionRelation;
    alignment: PreviewAlignment;
    magicState: "idle" | "loading" | "success" | "failure";
  }) => void;
  mount: (target: HTMLElement, relation: InsertionRelation, alignment: PreviewAlignment) => void;
  unmount: () => void;
};

export function createPreviewToolbar(
  handlers: {
    onUndo: () => void;
    onRetarget: () => void;
    onMagicAdapt: () => void;
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
  let currentRelation: InsertionRelation = "inside";
  let currentAlignment: PreviewAlignment = "start";
  let currentMagicState: "idle" | "loading" | "success" | "failure" = "idle";

  const renderToolbar = (): void => {
    if (!root) {
      root = createRoot(container);
    }
    root.render(
      createElement(PreviewToolbar, {
        relation: currentRelation,
        alignment: currentAlignment,
        magicState: currentMagicState,
        onUndo: handlers.onUndo,
        onRetarget: handlers.onRetarget,
        onMagicAdapt: handlers.onMagicAdapt,
        onRelationChange: handlers.onRelationChange,
        onAlignmentChange: handlers.onAlignmentChange
      })
    );
  };

  return {
    update(state) {
      currentRelation = state.relation;
      currentAlignment = state.alignment;
      currentMagicState = state.magicState;
      renderToolbar();
    },
    mount(target, relation, alignment) {
      currentRelation = relation;
      currentAlignment = alignment;
      currentMagicState = "idle";
      renderToolbar();
      if (!host.isConnected) {
        document.documentElement.appendChild(host);
      }
      if (!container.isConnected) {
        host.appendChild(container);
      }
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
