export type OverlayRoot = {
  root: HTMLDivElement;
  hoverOutline: HTMLDivElement;
  selectedOutline: HTMLDivElement;
  ghost: HTMLDivElement;
  label: HTMLDivElement;
  controlsHost: HTMLDivElement;
  showToast: (message: string) => void;
  destroy: () => void;
};

export function mountOverlayRoot(): OverlayRoot {
  const existing = document.getElementById("spectra-root");
  if (existing) {
    existing.remove();
  }

  const root = document.createElement("div");
  root.id = "spectra-root";
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.pointerEvents = "none";
  root.style.zIndex = "2147483647";

  const hoverOutline = createRectLayer("2px solid #4f8cff", "rgba(79,140,255,0.14)");
  const selectedOutline = createRectLayer("2px solid #35c759", "rgba(53,199,89,0.12)");
  const ghost = createRectLayer("1px dashed #f59e0b", "rgba(245,158,11,0.16)");
  const label = document.createElement("div");
  label.style.position = "fixed";
  label.style.display = "none";
  label.style.padding = "3px 8px";
  label.style.borderRadius = "999px";
  label.style.background = "rgba(17,24,39,0.94)";
  label.style.color = "#f8fafc";
  label.style.font = "11px/1.2 ui-sans-serif, system-ui, -apple-system, sans-serif";

  const controlsHost = document.createElement("div");
  controlsHost.style.position = "fixed";
  controlsHost.style.display = "none";
  controlsHost.style.pointerEvents = "auto";

  const toastHost = document.createElement("div");
  toastHost.style.position = "fixed";
  toastHost.style.right = "12px";
  toastHost.style.top = "12px";
  toastHost.style.display = "grid";
  toastHost.style.gap = "6px";

  root.append(hoverOutline, selectedOutline, ghost, label, controlsHost, toastHost);
  document.documentElement.appendChild(root);

  return {
    root,
    hoverOutline,
    selectedOutline,
    ghost,
    label,
    controlsHost,
    showToast(message) {
      const toast = document.createElement("div");
      toast.textContent = message;
      toast.style.maxWidth = "280px";
      toast.style.padding = "8px 10px";
      toast.style.borderRadius = "8px";
      toast.style.background = "rgba(17,24,39,0.94)";
      toast.style.color = "#f8fafc";
      toast.style.font = "12px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif";
      toast.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
      toastHost.appendChild(toast);
      window.setTimeout(() => {
        toast.remove();
      }, 1800);
    },
    destroy() {
      root.remove();
    }
  };
}

function createRectLayer(border: string, background: string): HTMLDivElement {
  const layer = document.createElement("div");
  layer.style.position = "fixed";
  layer.style.display = "none";
  layer.style.border = border;
  layer.style.background = background;
  layer.style.borderRadius = "6px";
  layer.style.boxSizing = "border-box";
  return layer;
}
