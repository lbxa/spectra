import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SavedPreviewListItem } from "../lib/library/types";
import { PreviewSessionToolbar } from "./PreviewSessionToolbar";

function createPreview(id: string, name: string): SavedPreviewListItem {
  return {
    id,
    name,
    status: "active",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    target: {
      origin: "https://example.com",
      pathname: "/",
      matchMode: "exact_path",
      canonicalUrl: "https://example.com/"
    },
    revision: 1
  };
}

describe("PreviewSessionToolbar", () => {
  it("renders toolbar actions and forwards click handlers", () => {
    const onSave = vi.fn();
    const onLoadPreviews = vi.fn();
    const onApplyPreview = vi.fn();
    const onClearAll = vi.fn();
    const onExit = vi.fn();

    render(
      <PreviewSessionToolbar
        previews={[createPreview("pv-1", "Preview One")]}
        isBusy={false}
        onSave={onSave}
        onLoadPreviews={onLoadPreviews}
        onApplyPreview={onApplyPreview}
        onClearAll={onClearAll}
        onExit={onExit}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Save preview" }));
    fireEvent.click(screen.getByRole("button", { name: /View saved/i }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onLoadPreviews).toHaveBeenCalledTimes(1);
    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onApplyPreview).not.toHaveBeenCalled();
  });

  it("disables actions while busy", () => {
    render(
      <PreviewSessionToolbar
        previews={[createPreview("pv-1", "Preview One")]}
        isBusy={true}
        onSave={() => undefined}
        onLoadPreviews={() => undefined}
        onApplyPreview={() => undefined}
        onClearAll={() => undefined}
        onExit={() => undefined}
      />
    );

    expect((screen.getByRole("button", { name: "Save preview" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /View saved/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Clear all" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Exit" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
