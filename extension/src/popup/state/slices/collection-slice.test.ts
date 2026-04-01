import type { Collection, SavedComponent } from "@/lib/library/types";
import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import { createAppSlice } from "./app-slice";
import {
  createCollectionSlice,
  initialCollectionSliceState,
  type PopupStore
} from "./collection-slice";
import { createPreviewsSlice } from "./previews-slice";

function createTestStore() {
  return createStore<PopupStore>()((...args) => ({
    ...createAppSlice(...args),
    ...createCollectionSlice(...args),
    ...createPreviewsSlice(...args)
  }));
}

function createCollection(id: string, name = id): Collection {
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

function createComponent(id: string, collectionId: string): SavedComponent {
  return {
    id,
    collectionIds: [collectionId],
    url: "https://example.com",
    title: id,
    capturedAt: new Date().toISOString(),
    html: "<div></div>",
    cssText: "",
    screenshotDataUrl: "data:image/png;base64,abc",
    sourceHostSignature: {
      landmark: "unknown",
      hostTag: "div",
      layoutMode: "unknown",
      widthBucket: "md",
      depth: 0,
      siblingCount: 0,
      ancestorTags: []
    }
  };
}

describe("collection slice", () => {
  it("openComponentCanvas sets selection, view, and lastViewed", () => {
    const store = createTestStore();

    store.getState().openComponentCanvas("col-1", "cmp-1");

    const state = store.getState();
    expect(state.selectedCollectionId).toBe("col-1");
    expect(state.selectedComponentId).toBe("cmp-1");
    expect(state.activeView).toBe("componentCanvas");
    expect(state.lastViewed).toMatchObject({
      view: "componentCanvas",
      collectionId: "col-1",
      componentId: "cmp-1"
    });
  });

  it("closeComponentCanvas clears component selection and lastViewed", () => {
    const store = createTestStore();
    store.getState().openComponentCanvas("col-1", "cmp-1");

    store.getState().closeComponentCanvas();

    const state = store.getState();
    expect(state.selectedComponentId).toBeNull();
    expect(state.activeView).toBe("collection");
    expect(state.lastViewed).toBeNull();
  });

  it("validateRestoredView restores a valid component canvas destination", () => {
    const store = createTestStore();
    store.setState({
      ...initialCollectionSliceState,
      lastViewed: {
        view: "componentCanvas",
        collectionId: "col-1",
        componentId: "cmp-1"
      }
    });

    const collections = [createCollection("col-1")];
    const componentsByCollectionId = {
      "col-1": [createComponent("cmp-1", "col-1")]
    };

    store.getState().validateRestoredView({ collections, componentsByCollectionId });

    const state = store.getState();
    expect(state.selectedCollectionId).toBe("col-1");
    expect(state.selectedComponentId).toBe("cmp-1");
    expect(state.activeView).toBe("componentCanvas");
    expect(state.lastViewed?.componentId).toBe("cmp-1");
  });

  it("validateRestoredView falls back to collection when component is missing", () => {
    const store = createTestStore();
    store.setState({
      ...initialCollectionSliceState,
      lastViewed: {
        view: "componentCanvas",
        collectionId: "col-1",
        componentId: "cmp-missing"
      }
    });

    store.getState().validateRestoredView({
      collections: [createCollection("col-1")],
      componentsByCollectionId: {
        "col-1": [createComponent("cmp-1", "col-1")]
      }
    });

    const state = store.getState();
    expect(state.selectedCollectionId).toBe("col-1");
    expect(state.selectedComponentId).toBeNull();
    expect(state.activeView).toBe("collection");
    expect(state.lastViewed).toBeNull();
  });

  it("validateRestoredView falls back safely when collection is missing", () => {
    const store = createTestStore();
    store.setState({
      ...initialCollectionSliceState,
      lastViewed: {
        view: "componentCanvas",
        collectionId: "col-deleted",
        componentId: "cmp-1"
      }
    });

    store.getState().validateRestoredView({
      collections: [createCollection("col-1"), createCollection("col-2")],
      componentsByCollectionId: {
        "col-1": [createComponent("cmp-1", "col-1")],
        "col-2": []
      }
    });

    const state = store.getState();
    expect(state.selectedCollectionId).toBe("col-1");
    expect(state.selectedComponentId).toBeNull();
    expect(state.activeView).toBe("collection");
    expect(state.lastViewed).toBeNull();
  });
});
