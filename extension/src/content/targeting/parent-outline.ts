import { resolveParentTarget } from "../capture/selection-runtime";
import { applyRectLayerBounds } from "./rect-layer";

export function hideParentOutline(layer: HTMLElement): void {
  layer.style.display = "none";
}

export function syncParentOutlineForTarget(
  layer: HTMLElement,
  target: Element | null,
  isShiftHeld: boolean
): void {
  if (!isShiftHeld || !target) {
    hideParentOutline(layer);
    return;
  }
  const parentTarget = resolveParentTarget(target);
  if (!parentTarget) {
    hideParentOutline(layer);
    return;
  }
  applyRectLayerBounds(layer, parentTarget.getBoundingClientRect(), {
    minWidth: 0,
    minHeight: 0
  });
}
