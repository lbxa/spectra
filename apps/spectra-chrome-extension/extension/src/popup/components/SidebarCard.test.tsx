import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SidebarCard } from "./SidebarCard";

describe("SidebarCard", () => {
  it("applies selected styling when active", () => {
    render(
      <SidebarCard isSelected={true} onClick={() => undefined}>
        <span>Selected card</span>
      </SidebarCard>
    );

    const card = screen.getByRole("button", { name: "Selected card" });
    expect(card).toHaveClass("border-primary", "bg-primary", "text-background");
  });

  it("applies default styling when inactive", () => {
    render(
      <SidebarCard isSelected={false} onClick={() => undefined}>
        <span>Inactive card</span>
      </SidebarCard>
    );

    const card = screen.getByRole("button", { name: "Inactive card" });
    expect(card).toHaveClass("border-border", "bg-background", "text-foreground");
  });

  it("supports click, Enter, and Space keyboard activation", () => {
    const onClick = vi.fn();
    render(
      <SidebarCard isSelected={false} onClick={onClick}>
        <span>Actionable card</span>
      </SidebarCard>
    );

    const card = screen.getByRole("button", { name: "Actionable card" });
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: " " });

    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("ignores keyboard events from nested targets", () => {
    const onClick = vi.fn();
    render(
      <SidebarCard isSelected={false} onClick={onClick}>
        <span>
          Parent
          <button type="button">Child button</button>
        </span>
      </SidebarCard>
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Child button" }), { key: "Enter" });
    expect(onClick).not.toHaveBeenCalled();
  });
});
