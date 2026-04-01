import { describe, expect, it } from "vitest";
import { createShortcutsHud } from "./ShortcutsHud";

describe("createShortcutsHud", () => {
  it("shows and hides the shortcuts panel with shift visual state", () => {
    const hud = createShortcutsHud();

    expect(document.querySelector("[data-component-picker-shortcuts='true']")).toBeNull();

    hud.setVisible(true);
    const panel = document.querySelector("[data-component-picker-shortcuts='true']");
    if (!(panel instanceof HTMLElement)) {
      throw new Error("Expected shortcuts panel");
    }
    expect(panel.textContent).toContain("Exit capture");

    const shiftKey = Array.from(panel.querySelectorAll("span")).find((node) => node.textContent === "Shift");
    if (!(shiftKey instanceof HTMLElement)) {
      throw new Error("Expected shift key indicator");
    }

    hud.setShiftActive(true);
    expect(shiftKey.style.borderColor).toContain("217, 70, 239");

    hud.setShiftActive(false);
    expect(shiftKey.style.borderColor).toContain("148, 163, 184");

    hud.setVisible(false);
    expect(document.querySelector("[data-component-picker-shortcuts='true']")).toBeNull();

    hud.destroy();
    expect(document.querySelector("[data-spectra-shortcuts-hud-root='true']")).toBeNull();
  });

  it("renders custom escape copy", () => {
    const hud = createShortcutsHud({ escapeDescription: "Exit preview" });
    hud.setVisible(true);
    expect(document.querySelector("[data-component-picker-shortcuts='true']")?.textContent).toContain("Exit preview");
    hud.destroy();
  });
});
