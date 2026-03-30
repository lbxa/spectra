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

describe("app slice", () => {
  it("stores active space as global popup state", () => {
    const store = createTestStore();

    store.getState().setActiveSpace("previews");

    expect(store.getState().activeSpace).toBe("previews");
  });
});
