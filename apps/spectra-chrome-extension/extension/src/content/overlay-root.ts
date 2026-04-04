import { createRectLayer } from "./targeting/rect-layer";

export type OverlayRoot = {
  root: HTMLDivElement;
  hoverOutline: HTMLDivElement;
  parentOutline: HTMLDivElement;
  selectedOutline: HTMLDivElement;
  ghost: HTMLDivElement;
  label: HTMLDivElement;
  controlsHost: HTMLDivElement;
  showToast: (message: string) => void;
  showFlash: () => void;
  destroy: () => void;
};

const FLASH_TRANSITION_MS = 250;

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

  const hoverOutline = createRectLayer({
    border: "2px solid #4f8cff",
    background: "rgba(79,140,255,0.14)"
  });
  const parentOutline = createRectLayer({
    border: "2px solid #d946ef",
    background: "rgba(217,70,239,0.1)"
  });
  const selectedOutline = createRectLayer({
    border: "2px solid #35c759",
    background: "rgba(53,199,89,0.12)"
  });
  const ghost = createRectLayer({
    border: "1px dashed #f59e0b",
    background: "rgba(245,158,11,0.16)"
  });
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

  const flashHost = document.createElement("div");
  flashHost.style.position = "fixed";
  flashHost.style.inset = "0";
  flashHost.style.pointerEvents = "none";
  flashHost.style.background = "rgba(255, 255, 255, 1)";
  flashHost.style.opacity = "0";
  flashHost.style.transition = `opacity ${FLASH_TRANSITION_MS}ms ease`;
  flashHost.style.zIndex = "2147483647";
  flashHost.style.display = "none";

  const timeoutIds = new Set<number>();
  const frameIds = new Set<number>();
  const flashTimeoutIds = new Set<number>();
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
  const registerFlashTimeout = (callback: () => void, delayMs: number): void => {
    const timeoutId = window.setTimeout(() => {
      timeoutIds.delete(timeoutId);
      flashTimeoutIds.delete(timeoutId);
      callback();
    }, delayMs);
    timeoutIds.add(timeoutId);
    flashTimeoutIds.add(timeoutId);
  };
  const clearFlashTimeouts = (): void => {
    for (const timeoutId of flashTimeoutIds) {
      window.clearTimeout(timeoutId);
      timeoutIds.delete(timeoutId);
    }
    flashTimeoutIds.clear();
  };

  root.append(hoverOutline, parentOutline, selectedOutline, ghost, label, controlsHost, toastHost, flashHost);
  document.documentElement.appendChild(root);

  return {
    root,
    hoverOutline,
    parentOutline,
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
    showFlash() {
      clearFlashTimeouts();
      flashHost.style.display = "block";
      flashHost.style.opacity = "1";
      registerFrame(() => {
        flashHost.style.opacity = "0";
      });
      registerFlashTimeout(() => {
        flashHost.style.display = "none";
      }, FLASH_TRANSITION_MS + 100);
    },
    destroy() {
      clearFlashTimeouts();
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

