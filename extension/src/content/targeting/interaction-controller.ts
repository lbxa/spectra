type TargetingEventContext = {
  isShiftHeld: boolean;
};

type InteractionControllerHandlers = {
  isActive: () => boolean;
  isKeyActive?: () => boolean;
  onHover?: (event: MouseEvent, target: Element, context: TargetingEventContext) => void;
  onCommit?: (event: MouseEvent, target: Element, context: TargetingEventContext) => void;
  onCancel?: (event: KeyboardEvent) => void;
  onDelete?: (event: KeyboardEvent) => void;
  onModifierChange?: (context: TargetingEventContext) => void;
  installGuards?: (isDone: () => boolean) => () => void;
};

export type InteractionController = {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
};

export function createInteractionController(handlers: InteractionControllerHandlers): InteractionController {
  let isRunning = false;
  let isShiftHeld = false;
  let teardownGuards: (() => void) | null = null;

  const isDone = (): boolean => !handlers.isActive();
  const isKeyActive = (): boolean => (handlers.isKeyActive ? handlers.isKeyActive() : handlers.isActive());

  const onMouseMove = (event: MouseEvent): void => {
    if (!handlers.isActive()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    handlers.onHover?.(event, target, { isShiftHeld: isShiftHeld || event.shiftKey });
  };

  const onClick = (event: MouseEvent): void => {
    if (!handlers.isActive()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    handlers.onCommit?.(event, target, { isShiftHeld: isShiftHeld || event.shiftKey });
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Shift" && !isShiftHeld) {
      isShiftHeld = true;
      handlers.onModifierChange?.({ isShiftHeld: true });
    }
    if (!isKeyActive()) {
      return;
    }
    if (event.key === "Escape") {
      handlers.onCancel?.(event);
      return;
    }
    if (event.key === "Delete") {
      handlers.onDelete?.(event);
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key !== "Shift" || !isShiftHeld) {
      return;
    }
    isShiftHeld = false;
    handlers.onModifierChange?.({ isShiftHeld: false });
  };

  const start = (): void => {
    if (isRunning) {
      return;
    }
    isRunning = true;
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    if (handlers.installGuards) {
      teardownGuards = handlers.installGuards(isDone);
    }
  };

  const stop = (): void => {
    if (!isRunning) {
      return;
    }
    isRunning = false;
    isShiftHeld = false;
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    teardownGuards?.();
    teardownGuards = null;
  };

  return {
    start,
    stop,
    isRunning: () => isRunning
  };
}
