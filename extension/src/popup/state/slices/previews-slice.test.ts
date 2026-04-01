import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import { createAppSlice } from "./app-slice";
import { createCollectionSlice, type PopupStore } from "./collection-slice";
import { createPreviewsSlice } from "./previews-slice";

function createTestStore() {
  return createStore<PopupStore>()((...args) => ({
    ...createAppSlice(...args),
    ...createCollectionSlice(...args),
    ...createPreviewsSlice(...args)
  }));
}

describe("previews slice", () => {
  it("sets and gets last visited preview per page", () => {
    const store = createTestStore();
    const pageKey = "https://example.com/path";

    store.getState().setLastVisitedPreview(pageKey, "preview-1");

    expect(store.getState().getLastVisitedPreview(pageKey)).toBe("preview-1");
  });

  it("overwrites page mapping when a new preview is selected", () => {
    const store = createTestStore();
    const pageKey = "https://example.com/path";

    store.getState().setLastVisitedPreview(pageKey, "preview-1");
    store.getState().setLastVisitedPreview(pageKey, "preview-2");

    expect(store.getState().getLastVisitedPreview(pageKey)).toBe("preview-2");
  });

  it("clears only the target page mapping", () => {
    const store = createTestStore();
    const pageA = "https://example.com/a";
    const pageB = "https://example.com/b";

    store.getState().setLastVisitedPreview(pageA, "preview-a");
    store.getState().setLastVisitedPreview(pageB, "preview-b");
    store.getState().clearLastVisitedPreview(pageA);

    expect(store.getState().getLastVisitedPreview(pageA)).toBeNull();
    expect(store.getState().getLastVisitedPreview(pageB)).toBe("preview-b");
  });

  it("ignores empty page or preview values", () => {
    const store = createTestStore();

    store.getState().setLastVisitedPreview("", "preview-1");
    store.getState().setLastVisitedPreview("https://example.com/path", "");

    expect(store.getState().lastVisitedPreviewByPageKey).toEqual({});
  });
});
