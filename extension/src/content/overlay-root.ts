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
  root.style.zIndex = "2147483646";

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
  toastHost.style.left = "50%";
  toastHost.style.top = "16px";
  toastHost.style.transform = "translateX(-50%) translateY(-14px)";
  toastHost.style.opacity = "0";
  toastHost.style.transition = "transform 220ms ease, opacity 220ms ease";
  toastHost.style.pointerEvents = "none";
  toastHost.style.zIndex = "2147483647";

  const timeoutIds = new Set<number>();
  const frameIds = new Set<number>();
  const registerTimeout = (callback: () => void, delayMs: number): void => {
    const timeoutId = window.setTimeout(() => {
      timeoutIds.delete(timeoutId);
      callback();
    }, delayMs);
    timeoutIds.add(timeoutId);
  };
  const registerFrame = (callback: () => void): void => {
    const frameId = window.requestAnimationFrame(() => {
      frameIds.delete(frameId);
      callback();
    });
    frameIds.add(frameId);
  };

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
      toastHost.textContent = message;
      toastHost.style.background = "rgba(17, 24, 39, 0.92)";
      toastHost.style.color = "#f9fafb";
      toastHost.style.padding = "8px 12px";
      toastHost.style.borderRadius = "8px";
      toastHost.style.whiteSpace = "nowrap";
      toastHost.style.maxWidth = "calc(100vw - 24px)";
      toastHost.style.textOverflow = "ellipsis";
      toastHost.style.overflow = "hidden";
      toastHost.style.font = "12px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      toastHost.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.25)";
      toastHost.style.transform = "translateX(-50%) translateY(-14px)";
      toastHost.style.opacity = "0";
      registerFrame(() => {
        toastHost.style.transform = "translateX(-50%) translateY(0)";
        toastHost.style.opacity = "1";
      });
      registerTimeout(() => {
        toastHost.style.transform = "translateX(-50%) translateY(-14px)";
        toastHost.style.opacity = "0";
      }, 1400);
      registerTimeout(() => {
        toastHost.textContent = "";
      }, 1620);
    },
    destroy() {
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId);
      }
      timeoutIds.clear();
      for (const frameId of frameIds) {
        window.cancelAnimationFrame(frameId);
      }
      frameIds.clear();
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
