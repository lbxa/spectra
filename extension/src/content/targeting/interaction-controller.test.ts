import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInteractionController } from "./interaction-controller";

describe("interaction-controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("dispatches hover and commit callbacks while active", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onHover = vi.fn();
    const onCommit = vi.fn();
    const controller = createInteractionController({
      isActive: () => true,
      onHover,
      onCommit
    });

    controller.start();
    target.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onHover).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  it("tracks Shift modifier transitions", () => {
    const onModifierChange = vi.fn();
    const controller = createInteractionController({
      isActive: () => true,
      onModifierChange
    });

    controller.start();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", bubbles: true }));

    expect(onModifierChange).toHaveBeenNthCalledWith(1, { isShiftHeld: true });
    expect(onModifierChange).toHaveBeenNthCalledWith(2, { isShiftHeld: false });
    controller.stop();
  });

  it("invokes cancel and delete handlers only while active", () => {
    let active = true;
    const onCancel = vi.fn();
    const onDelete = vi.fn();
    const controller = createInteractionController({
      isActive: () => active,
      onCancel,
      onDelete
    });

    controller.start();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    active = false;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  it("installs and tears down guards with lifecycle", () => {
    const teardownGuards = vi.fn();
    const installGuards = vi.fn(() => teardownGuards);
    const controller = createInteractionController({
      isActive: () => true,
      installGuards
    });

    controller.start();
    controller.stop();

    expect(installGuards).toHaveBeenCalledTimes(1);
    expect(teardownGuards).toHaveBeenCalledTimes(1);
  });
});
