import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Collection } from "@/lib/library/types";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CollectionRail } from "./CollectionRail";

function createCollection(id: string, name: string): Collection {
  const now = new Date().toISOString();
  return {
    id,
    name,
    description: "",
    createdAt: now,
    updatedAt: now,
    isSystem: false
  };
}

describe("CollectionRail", () => {
  it("focuses name input when renaming from context menu", async () => {
    const collections = [createCollection("col-1", "First"), createCollection("col-2", "Second")];

    const Harness = () => {
      const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>("col-1");
      return (
        <CollectionRail
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          componentCounts={{ "col-1": 1, "col-2": 2 }}
          onSelectCollection={setSelectedCollectionId}
          onDeleteCollection={vi.fn()}
          onCreateCollection={vi.fn(async () => undefined)}
          onUpdateCollection={vi.fn(async () => undefined)}
        />
      );
    };

    render(<Harness />);

    const secondCardButton = screen.getByDisplayValue("Second").closest('[role="button"]');
    expect(secondCardButton).not.toBeNull();

    fireEvent.contextMenu(secondCardButton as HTMLElement);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Second")).toHaveFocus();
    });
  });
});
