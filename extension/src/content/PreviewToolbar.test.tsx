import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreviewToolbar } from "./PreviewToolbar";

describe("PreviewToolbar", () => {
  it("routes undo, retarget, and alignment actions", () => {
    const onUndo = vi.fn();
    const onRetarget = vi.fn();
    const onRelationChange = vi.fn();
    const onAlignmentChange = vi.fn();

    render(
      <PreviewToolbar
        relation="inside"
        alignment="start"
        onUndo={onUndo}
        onRetarget={onRetarget}
        onRelationChange={onRelationChange}
        onAlignmentChange={onAlignmentChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Retarget" }));
    fireEvent.click(screen.getByRole("button", { name: "Center align" }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRetarget).toHaveBeenCalledTimes(1);
    expect(onAlignmentChange).toHaveBeenCalledWith("center");
    expect(onRelationChange).not.toHaveBeenCalled();
  });
});
