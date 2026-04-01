import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createCollectionSlice,
  initialCollectionSliceState,
  type CollectionSlice,
  type PopupStore
} from "./slices/collection-slice";
import {
  createAppSlice,
  initialAppSliceState,
  type AppSlice
} from "./slices/app-slice";
import {
  createPreviewsSlice,
  initialPreviewsSliceState,
  type PreviewsSlice
} from "./slices/previews-slice";
import { chromeStorageStateStorage } from "./storage/chrome-storage";

const POPUP_STORE_PERSIST_KEY = "spectra-popup-store";
const POPUP_STORE_PERSIST_VERSION = 3;

type PersistedPopupStoreState = Pick<
  CollectionSlice,
  "selectedCollectionId" | "selectedComponentId" | "activeView" | "lastViewed"
> &
  Pick<AppSlice, "activeSpace"> &
  Pick<PreviewsSlice, "lastVisitedPreviewByPageKey">;

export const usePopupStore = create<PopupStore>()(
  persist(
    (...args) => ({
      ...createAppSlice(...args),
      ...createCollectionSlice(...args),
      ...createPreviewsSlice(...args)
    }),
    {
      name: POPUP_STORE_PERSIST_KEY,
      version: POPUP_STORE_PERSIST_VERSION,
      storage: createJSONStorage(() => chromeStorageStateStorage),
      skipHydration: true,
      partialize: (state): PersistedPopupStoreState => ({
        selectedCollectionId: state.selectedCollectionId,
        selectedComponentId: state.selectedComponentId,
        activeSpace: state.activeSpace,
        activeView: state.activeView,
        lastViewed: state.lastViewed,
        lastVisitedPreviewByPageKey: state.lastVisitedPreviewByPageKey
      }),
      migrate: (persistedState, version) => {
        if (version === POPUP_STORE_PERSIST_VERSION) {
          return persistedState as PopupStore;
        }

        return {
          ...initialAppSliceState,
          ...initialCollectionSliceState,
          ...initialPreviewsSliceState,
          ...(persistedState as Partial<PopupStore>)
        } as PopupStore;
      }
    }
  )
);
