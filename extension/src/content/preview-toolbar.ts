import type { InsertionRelation } from "../lib/library/messages";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";

export type PreviewToolbarControls = {
  mount: (target: HTMLElement, relation: InsertionRelation) => void;
  unmount: () => void;
};

export function createPreviewToolbar(
  host: HTMLElement,
  handlers: {
    onUndo: () => void;
    onRetarget: () => void;
    onRelationChange: (relation: InsertionRelation) => void;
  }
): PreviewToolbarControls {
  const container = document.createElement("div");
  container.style.display = "inline-flex";
  container.style.alignItems = "center";
  container.style.gap = "6px";
  container.style.padding = "6px";
  container.style.borderRadius = "12px";
  container.style.border = "1px solid rgba(148,163,184,0.28)";
  container.style.background = "rgba(17,24,39,0.95)";
  container.style.color = "#f8fafc";
  container.style.font = "11px/1 ui-sans-serif, system-ui, -apple-system, sans-serif";
  container.style.boxShadow = "0 10px 22px rgba(0,0,0,0.25)";

  const undo = makeButton("Undo", handlers.onUndo);
  const retarget = makeButton("Retarget", handlers.onRetarget);
  const relation = document.createElement("select");
  relation.innerHTML = `<option value="inside-end">Inside</option><option value="before">Before</option><option value="after">After</option>`;
  relation.style.height = "24px";
  relation.style.borderRadius = "6px";
  relation.style.border = "1px solid rgba(148,163,184,0.4)";
  relation.style.background = "rgba(15,23,42,1)";
  relation.style.color = "#f8fafc";
  relation.onchange = () => {
    const value = relation.value;
    if (value === "inside-end" || value === "before" || value === "after") {
      handlers.onRelationChange(value);
    }
  };

  container.append(undo, retarget, relation);
  host.appendChild(container);
  let cleanupAutoUpdate: (() => void) | null = null;

  return {
    mount(target, currentRelation) {
      relation.value = currentRelation;
      host.style.display = "block";

      const updatePosition = (): void => {
        void computePosition(target, host, {
          placement: "top",
          strategy: "fixed",
          middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 })]
        }).then(({ x, y }) => {
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
      host.style.display = "none";
      container.remove();
    }
  };
}

function makeButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.style.height = "24px";
  button.style.padding = "0 8px";
  button.style.borderRadius = "6px";
  button.style.border = "1px solid rgba(148,163,184,0.4)";
  button.style.background = "rgba(15,23,42,1)";
  button.style.color = "#f8fafc";
  button.style.cursor = "pointer";
  button.onclick = onClick;
  return button;
}
