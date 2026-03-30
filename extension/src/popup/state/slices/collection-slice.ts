import type { Collection, SavedComponent } from "@/lib/library/types";
import type { StateCreator } from "zustand";

export type PopupView = "collection" | "componentCanvas";
export type HydrateStatus = "idle" | "hydrating" | "ready" | "error";

export type LastViewedComponent = {
  view: "componentCanvas";
  collectionId: string;
  componentId: string;
  savedAt?: string;
};

export type CollectionSlice = {
  selectedCollectionId: string | null;
  selectedComponentId: string | null;
  activeView: PopupView;
  lastViewed: LastViewedComponent | null;
  hasHydrated: boolean;
  hydrateStatus: HydrateStatus;
  openCollection: (collectionId: string) => void;
  openComponentCanvas: (collectionId: string, componentId: string) => void;
  closeComponentCanvas: () => void;
  setLastViewedComponent: (collectionId: string, componentId: string) => void;
  clearLastViewedComponent: () => void;
  markHydrating: () => void;
  markHydrated: () => void;
  markHydrationError: () => void;
  removeComponent: (componentId: string) => void;
  removeCollection: (collectionId: string) => void;
  validateRestoredView: (input: {
    collections: Collection[];
    componentsByCollectionId: Record<string, SavedComponent[]>;
  }) => void;
};

export type PopupStore = CollectionSlice;
type PopupStoreCreator<TSlice> = StateCreator<
  PopupStore,
  [],
  [],
  TSlice
>;

export const initialCollectionSliceState: Pick<
  CollectionSlice,
  | "selectedCollectionId"
  | "selectedComponentId"
  | "activeView"
  | "lastViewed"
  | "hasHydrated"
  | "hydrateStatus"
> = {
  selectedCollectionId: null,
  selectedComponentId: null,
  activeView: "collection",
  lastViewed: null,
  hasHydrated: false,
  hydrateStatus: "idle"
};

export const createCollectionSlice: PopupStoreCreator<CollectionSlice> = (set, get) => ({
  ...initialCollectionSliceState,
  openCollection(collectionId) {
    set({
      selectedCollectionId: collectionId,
      selectedComponentId: null,
      activeView: "collection",
      lastViewed: null
    });
  },
  openComponentCanvas(collectionId, componentId) {
    const savedAt = new Date().toISOString();
    set({
      selectedCollectionId: collectionId,
      selectedComponentId: componentId,
      activeView: "componentCanvas",
      lastViewed: {
        view: "componentCanvas",
        collectionId,
        componentId,
        savedAt
      }
    });
  },
  closeComponentCanvas() {
    set({
      selectedComponentId: null,
      activeView: "collection",
      lastViewed: null
    });
  },
  setLastViewedComponent(collectionId, componentId) {
    set({
      lastViewed: {
        view: "componentCanvas",
        collectionId,
        componentId,
        savedAt: new Date().toISOString()
      }
    });
  },
  clearLastViewedComponent() {
    set({
      lastViewed: null
    });
  },
  markHydrating() {
    set({
      hasHydrated: false,
      hydrateStatus: "hydrating"
    });
  },
  markHydrated() {
    set({
      hasHydrated: true,
      hydrateStatus: "ready"
    });
  },
  markHydrationError() {
    set({
      hasHydrated: true,
      hydrateStatus: "error"
    });
  },
  removeComponent(componentId) {
    const { selectedComponentId, lastViewed } = get();
    set({
      selectedComponentId: selectedComponentId === componentId ? null : selectedComponentId,
      activeView: selectedComponentId === componentId ? "collection" : get().activeView,
      lastViewed: lastViewed?.componentId === componentId ? null : lastViewed
    });
  },
  removeCollection(collectionId) {
    const { selectedCollectionId, selectedComponentId, lastViewed } = get();
    set({
      selectedCollectionId: selectedCollectionId === collectionId ? null : selectedCollectionId,
      selectedComponentId: selectedCollectionId === collectionId ? null : selectedComponentId,
      activeView: selectedCollectionId === collectionId ? "collection" : get().activeView,
      lastViewed: lastViewed?.collectionId === collectionId ? null : lastViewed
    });
  },
  validateRestoredView({ collections, componentsByCollectionId }) {
    const existingCollectionIds = new Set(collections.map((collection) => collection.id));
    const fallbackCollectionId = collections[0]?.id ?? null;

    const state = get();
    let selectedCollectionId = state.selectedCollectionId;
    if (selectedCollectionId && !existingCollectionIds.has(selectedCollectionId)) {
      selectedCollectionId = null;
    }
    if (!selectedCollectionId) {
      selectedCollectionId = fallbackCollectionId;
    }

    const lastViewed = state.lastViewed;
    if (lastViewed?.view === "componentCanvas") {
      const hasCollection = existingCollectionIds.has(lastViewed.collectionId);
      if (!hasCollection) {
        set({
          selectedCollectionId,
          selectedComponentId: null,
          activeView: "collection",
          lastViewed: null
        });
        return;
      }

      const components = componentsByCollectionId[lastViewed.collectionId] ?? [];
      const hasComponent = components.some((component) => component.id === lastViewed.componentId);
      if (hasComponent) {
        set({
          selectedCollectionId: lastViewed.collectionId,
          selectedComponentId: lastViewed.componentId,
          activeView: "componentCanvas"
        });
        return;
      }

      set({
        selectedCollectionId: lastViewed.collectionId,
        selectedComponentId: null,
        activeView: "collection",
        lastViewed: null
      });
      return;
    }

    set({
      selectedCollectionId,
      selectedComponentId: null,
      activeView: "collection"
    });
  }
});
