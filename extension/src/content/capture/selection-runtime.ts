import type { Bounds } from "../../lib/library/messages";

const FRAME_WAIT_TIMEOUT_MS = 120;

export function resolveSelectedTarget(target: Element, isShiftHeld: boolean): Element {
  if (!isShiftHeld) {
    return target;
  }
  return resolveParentTarget(target) ?? target;
}

export function resolveParentTarget(target: Element): Element | null {
  return target.parentElement;
}

export function installCaptureInteractionGuards(isDone: () => boolean): () => void {
  const onPointerAction = (event: Event): void => {
    if (isDone()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
  const onSelectStart = (event: Event): void => {
    if (isDone()) {
      return;
    }
    event.preventDefault();
  };
  const guardEvents: Array<keyof DocumentEventMap> = ["mousedown", "mouseup", "dragstart", "contextmenu"];
  for (const eventName of guardEvents) {
    document.addEventListener(eventName, onPointerAction, true);
  }
  document.addEventListener("selectstart", onSelectStart, true);
  return () => {
    for (const eventName of guardEvents) {
      document.removeEventListener(eventName, onPointerAction, true);
    }
    document.removeEventListener("selectstart", onSelectStart, true);
  };
}

export function clearDocumentSelection(): void {
  window.getSelection()?.removeAllRanges();
}

export function clampBoundsToVisibleViewport(rect: DOMRect): Bounds {
  const viewportLeft = 0;
  const viewportTop = 0;
  const viewportRight = window.innerWidth;
  const viewportBottom = window.innerHeight;

  const clippedLeft = Math.max(viewportLeft, rect.left);
  const clippedTop = Math.max(viewportTop, rect.top);
  const clippedRight = Math.min(viewportRight, rect.right);
  const clippedBottom = Math.min(viewportBottom, rect.bottom);

  return {
    left: clippedLeft,
    top: clippedTop,
    width: Math.max(0, clippedRight - clippedLeft),
    height: Math.max(0, clippedBottom - clippedTop)
  };
}

export async function waitForPostCleanupPaint(): Promise<void> {
  if (typeof window.requestAnimationFrame !== "function") {
    await waitForDelay(FRAME_WAIT_TIMEOUT_MS);
    return;
  }

  await waitForAnimationFrameWithTimeout();
  await waitForAnimationFrameWithTimeout();
}

function waitForAnimationFrameWithTimeout(): Promise<void> {
  return new Promise((resolve) => {
    let isSettled = false;
    const settle = (): void => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      resolve();
    };

    const timeoutId = window.setTimeout(() => {
      settle();
    }, FRAME_WAIT_TIMEOUT_MS);

    window.requestAnimationFrame(() => {
      window.clearTimeout(timeoutId);
      settle();
    });
  });
}

function waitForDelay(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}
