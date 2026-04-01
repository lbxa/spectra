type RectLayerBoundsOptions = {
  minWidth?: number;
  minHeight?: number;
};

type CreateRectLayerOptions = {
  border: string;
  background: string;
  borderRadius?: string;
  pointerEvents?: string;
  zIndex?: string;
};

const RECT_LAYER_TRANSITION =
  "left 60ms linear, top 60ms linear, width 60ms linear, height 60ms linear";

export function createRectLayer(options: CreateRectLayerOptions): HTMLDivElement {
  const layer = document.createElement("div");
  layer.style.position = "fixed";
  layer.style.display = "none";
  layer.style.border = options.border;
  layer.style.background = options.background;
  layer.style.borderRadius = options.borderRadius ?? "6px";
  layer.style.boxSizing = "border-box";
  layer.style.pointerEvents = options.pointerEvents ?? "none";
  layer.style.transition = RECT_LAYER_TRANSITION;
  if (options.zIndex) {
    layer.style.zIndex = options.zIndex;
  }
  return layer;
}

export function applyRectLayerBounds(
  layer: HTMLElement,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  options: RectLayerBoundsOptions = {}
): void {
  const minWidth = options.minWidth ?? 0;
  const minHeight = options.minHeight ?? 0;
  layer.style.display = "block";
  layer.style.left = `${Math.max(0, rect.left)}px`;
  layer.style.top = `${Math.max(0, rect.top)}px`;
  layer.style.width = `${Math.max(minWidth, rect.width)}px`;
  layer.style.height = `${Math.max(minHeight, rect.height)}px`;
}
