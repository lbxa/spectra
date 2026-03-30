import { beforeEach, describe, expect, it } from "vitest";

import { libraryRepository } from "./repository";
import { INBOX_COLLECTION_ID, type SavedComponent } from "./types";

const TEST_HOST_SIGNATURE: SavedComponent["sourceHostSignature"] = {
  landmark: "unknown",
  hostTag: "div",
  layoutMode: "unknown",
  widthBucket: "md",
  depth: 0,
  siblingCount: 0,
  ancestorTags: []
};

async function resetLibraryState(): Promise<void> {
  await libraryRepository.initLibrary();

  const components = await libraryRepository.listComponents();
  for (const component of components) {
    await libraryRepository.deleteComponent(component.id);
  }

  const collections = await libraryRepository.listCollections();
  for (const collection of collections) {
    if (collection.id === INBOX_COLLECTION_ID) {
      continue;
    }
    await libraryRepository.deleteCollection(collection.id);
  }
}

function buildComponent(id: string, collectionIds: string[]): SavedComponent {
  return {
    id,
    collectionIds,
    url: `https://example.com/${id}`,
    title: `Component ${id}`,
    capturedAt: "2026-03-30T12:00:00.000Z",
    html: `<div id="${id}">content</div>`,
    cssText: "",
    screenshotDataUrl: "data:image/png;base64,aaa",
    sourceHostSignature: TEST_HOST_SIGNATURE
  };
}

describe("library repository collection deletion", () => {
  beforeEach(async () => {
    await resetLibraryState();
  });

  it("deletes components that only belong to the deleted collection", async () => {
    const collection = await libraryRepository.createCollection({ name: "Delete-only-target" });
    const component = buildComponent("exclusive-component", [collection.id]);
    await libraryRepository.saveComponent(component);

    await libraryRepository.deleteCollection(collection.id);

    await expect(libraryRepository.getComponent(component.id)).resolves.toBeNull();
  });

  it("preserves shared components and removes only the deleted collection reference", async () => {
    const deletingCollection = await libraryRepository.createCollection({ name: "To-delete" });
    const survivingCollection = await libraryRepository.createCollection({ name: "Survivor" });

    const sharedComponent = buildComponent("shared-component", [
      deletingCollection.id,
      survivingCollection.id
    ]);
    await libraryRepository.saveComponent(sharedComponent);

    await libraryRepository.deleteCollection(deletingCollection.id);

    await expect(libraryRepository.getComponent(sharedComponent.id)).resolves.toMatchObject({
      id: sharedComponent.id,
      collectionIds: [survivingCollection.id]
    });
    await expect(libraryRepository.listComponents(survivingCollection.id)).resolves.toMatchObject([
      { id: sharedComponent.id, collectionIds: [survivingCollection.id] }
    ]);
  });

  it("keeps inbox guardrail", async () => {
    await expect(libraryRepository.deleteCollection(INBOX_COLLECTION_ID)).rejects.toThrow(
      "Inbox cannot be deleted."
    );
  });
});

describe("library repository copy and move", () => {
  beforeEach(async () => {
    await resetLibraryState();
  });

  it("copies a component to another collection without removing existing memberships", async () => {
    const sourceCollection = await libraryRepository.createCollection({ name: "Source copy" });
    const targetCollection = await libraryRepository.createCollection({ name: "Target copy" });
    const component = buildComponent("copy-component", [sourceCollection.id]);
    await libraryRepository.saveComponent(component);

    const copied = await libraryRepository.copyComponentToCollection(component.id, targetCollection.id);

    expect(copied.collectionIds).toContain(sourceCollection.id);
    expect(copied.collectionIds).toContain(targetCollection.id);
    await expect(libraryRepository.listComponents(sourceCollection.id)).resolves.toMatchObject([
      { id: component.id }
    ]);
    await expect(libraryRepository.listComponents(targetCollection.id)).resolves.toMatchObject([
      { id: component.id }
    ]);
  });

  it("moves a component from source to target collection and preserves other memberships", async () => {
    const sourceCollection = await libraryRepository.createCollection({ name: "Source move" });
    const targetCollection = await libraryRepository.createCollection({ name: "Target move" });
    const extraCollection = await libraryRepository.createCollection({ name: "Extra keep" });
    const component = buildComponent("move-component", [sourceCollection.id, extraCollection.id]);
    await libraryRepository.saveComponent(component);

    const moved = await libraryRepository.moveComponentToCollection(
      component.id,
      sourceCollection.id,
      targetCollection.id
    );

    expect(moved.collectionIds).not.toContain(sourceCollection.id);
    expect(moved.collectionIds).toContain(targetCollection.id);
    expect(moved.collectionIds).toContain(extraCollection.id);
    await expect(libraryRepository.listComponents(sourceCollection.id)).resolves.toEqual([]);
    await expect(libraryRepository.listComponents(targetCollection.id)).resolves.toMatchObject([
      { id: component.id }
    ]);
    await expect(libraryRepository.listComponents(extraCollection.id)).resolves.toMatchObject([
      { id: component.id }
    ]);
  });
});
