import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createCollectionSlice,
  initialCollectionSliceState,
  type CollectionSlice,
  type PopupStore
} from "./slices/collection-slice";
import { chromeStorageStateStorage } from "./storage/chrome-storage";

const POPUP_STORE_PERSIST_KEY = "spectra-popup-store";
const POPUP_STORE_PERSIST_VERSION = 1;

type PersistedPopupStoreState = Pick<
  CollectionSlice,
  "selectedCollectionId" | "selectedComponentId" | "activeView" | "lastViewed"
>;

export const usePopupStore = create<PopupStore>()(
  persist(
    (...args) => ({
      ...createCollectionSlice(...args)
    }),
    {
      name: POPUP_STORE_PERSIST_KEY,
      version: POPUP_STORE_PERSIST_VERSION,
      storage: createJSONStorage(() => chromeStorageStateStorage),
      skipHydration: true,
      partialize: (state): PersistedPopupStoreState => ({
        selectedCollectionId: state.selectedCollectionId,
        selectedComponentId: state.selectedComponentId,
        activeView: state.activeView,
        lastViewed: state.lastViewed
      }),
      migrate: (persistedState, version) => {
        if (version === POPUP_STORE_PERSIST_VERSION) {
          return persistedState as PopupStore;
        }

        return {
          ...initialCollectionSliceState,
          ...(persistedState as Partial<PopupStore>)
        } as PopupStore;
      }
    }
  )
);
