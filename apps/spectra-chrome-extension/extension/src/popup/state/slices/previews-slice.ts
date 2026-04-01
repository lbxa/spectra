import type { StateCreator } from "zustand";
import type { PopupStore } from "./collection-slice";

export type PreviewsSlice = {
  lastVisitedPreviewByPageKey: Record<string, string>;
  setLastVisitedPreview: (pageKey: string, previewId: string) => void;
  clearLastVisitedPreview: (pageKey: string) => void;
  getLastVisitedPreview: (pageKey: string) => string | null;
};

type PopupStoreCreator<TSlice> = StateCreator<
  PopupStore,
  [],
  [],
  TSlice
>;

export const initialPreviewsSliceState: Pick<
  PreviewsSlice,
  "lastVisitedPreviewByPageKey"
> = {
  lastVisitedPreviewByPageKey: {}
};

export const createPreviewsSlice: PopupStoreCreator<PreviewsSlice> = (set, get) => ({
  ...initialPreviewsSliceState,
  setLastVisitedPreview(pageKey, previewId) {
    const normalizedPageKey = pageKey.trim();
    const normalizedPreviewId = previewId.trim();
    if (!normalizedPageKey || !normalizedPreviewId) {
      return;
    }
    set((state) => ({
      lastVisitedPreviewByPageKey: {
        ...state.lastVisitedPreviewByPageKey,
        [normalizedPageKey]: normalizedPreviewId
      }
    }));
  },
  clearLastVisitedPreview(pageKey) {
    const normalizedPageKey = pageKey.trim();
    if (!normalizedPageKey) {
      return;
    }
    set((state) => {
      if (!Object.hasOwn(state.lastVisitedPreviewByPageKey, normalizedPageKey)) {
        return state;
      }
      const next = { ...state.lastVisitedPreviewByPageKey };
      delete next[normalizedPageKey];
      return {
        lastVisitedPreviewByPageKey: next
      };
    });
  },
  getLastVisitedPreview(pageKey) {
    const normalizedPageKey = pageKey.trim();
    if (!normalizedPageKey) {
      return null;
    }
    return get().lastVisitedPreviewByPageKey[normalizedPageKey] ?? null;
  }
});
