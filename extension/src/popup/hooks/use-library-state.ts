import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { isLibraryUpdatedMessage } from "@/lib/library/messages";
import { libraryRepository } from "@/lib/library/repository";
import type { Collection, SavedComponent } from "@/lib/library/types";
import { getLibraryPreferences, setSelectedCollectionPreference } from "../lib/library-preferences";

export type LibraryViewState = {
  selectedCollectionId: string | null;
  collections: Collection[];
  componentsByCollectionId: Record<string, SavedComponent[]>;
  isLoading: boolean;
};

export function useLibraryState(input: {
  selectedCollectionId: string | null;
  selectedComponentId: string | null;
  hasHydrated: boolean;
  hydrateStatus: "idle" | "hydrating" | "ready" | "error";
  removeComponent: (componentId: string) => void;
  validateRestoredView: (input: {
    collections: Collection[];
    componentsByCollectionId: Record<string, SavedComponent[]>;
  }) => void;
}): {
  libraryState: LibraryViewState;
  setLibraryState: Dispatch<SetStateAction<LibraryViewState>>;
  statusMessage: string;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  refreshLibraryState: (preferredCollectionId: string | null) => Promise<void>;
} {
  const [libraryState, setLibraryState] = useState<LibraryViewState>({
    selectedCollectionId: null,
    collections: [],
    componentsByCollectionId: {},
    isLoading: true
  });
  const [statusMessage, setStatusMessage] = useState("");

  const refreshLibraryState = async (preferredCollectionId: string | null): Promise<void> => {
    setLibraryState((current) => ({
      ...current,
      isLoading: true
    }));
    await libraryRepository.initLibrary();

    const [meta, preferences, collections] = await Promise.all([
      libraryRepository.getLibraryMeta(),
      getLibraryPreferences(),
      libraryRepository.listCollections()
    ]);
    const selectedCollectionId = resolveSelectedCollectionId({
      collections,
      preferredCollectionId,
      preferenceCollectionId: preferences.selectedCollectionId,
      defaultCollectionId: meta.defaultCollectionId
    });

    const componentsByCollectionId: Record<string, SavedComponent[]> = {};
    for (const collection of collections) {
      componentsByCollectionId[collection.id] = await libraryRepository.listComponents(collection.id);
    }

    setLibraryState({
      selectedCollectionId,
      collections,
      componentsByCollectionId,
      isLoading: false
    });
    await setSelectedCollectionPreference(selectedCollectionId);
    setStatusMessage(`${countComponents(componentsByCollectionId)} saved component(s)`);
  };

  useEffect(() => {
    void refreshLibraryState(null);
  }, []);

  useEffect(() => {
    const listener = (message: unknown): void => {
      if (!isLibraryUpdatedMessage(message)) {
        return;
      }
      if (message.payload.event === "COLLECTION_UPDATED" && message.payload.collection) {
        const updatedCollection = message.payload.collection;
        setLibraryState((current) => ({
          ...current,
          collections: current.collections.map((collection) =>
            collection.id === updatedCollection.id ? updatedCollection : collection
          )
        }));
        return;
      }

      if (message.payload.event === "COLLECTION_CREATED" && message.payload.collection) {
        const createdCollection = message.payload.collection;
        setLibraryState((current) => ({
          ...current,
          collections: sortCollectionsByUpdatedAtUnique([createdCollection, ...current.collections]),
          componentsByCollectionId: {
            ...current.componentsByCollectionId,
            [createdCollection.id]: current.componentsByCollectionId[createdCollection.id] ?? []
          }
        }));
        return;
      }

      if (message.payload.event === "COLLECTION_DELETED" && message.payload.id) {
        const deletedCollectionId = message.payload.id;
        setLibraryState((current) => {
          const nextCollections = current.collections.filter((collection) => collection.id !== deletedCollectionId);
          const nextComponentsByCollectionId = deleteCollectionFromBuckets(
            current.componentsByCollectionId,
            nextCollections,
            deletedCollectionId
          );
          const nextSelectedCollectionId =
            current.selectedCollectionId === deletedCollectionId
              ? (nextCollections[0]?.id ?? null)
              : current.selectedCollectionId;
          return {
            ...current,
            selectedCollectionId: nextSelectedCollectionId,
            collections: nextCollections,
            componentsByCollectionId: nextComponentsByCollectionId
          };
        });
        return;
      }

      if (
        (message.payload.event === "COMPONENT_MOVED" || message.payload.event === "COMPONENT_SAVED") &&
        message.payload.component
      ) {
        const upsertedComponent = message.payload.component;
        setLibraryState((current) => ({
          ...current,
          componentsByCollectionId: upsertComponentAcrossBuckets(current.componentsByCollectionId, upsertedComponent)
        }));
        return;
      }

      if (message.payload.event === "COMPONENT_DELETED" && message.payload.id) {
        const deletedComponentId = message.payload.id;
        setLibraryState((current) => ({
          ...current,
          componentsByCollectionId: removeComponentFromBuckets(current.componentsByCollectionId, deletedComponentId)
        }));
        return;
      }

      void refreshLibraryState(input.selectedCollectionId);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [input.selectedCollectionId]);

  useEffect(() => {
    if (!input.selectedComponentId || libraryState.isLoading) {
      return;
    }

    const exists = Object.values(libraryState.componentsByCollectionId)
      .flat()
      .some((component) => component.id === input.selectedComponentId);
    if (!exists) {
      input.removeComponent(input.selectedComponentId);
    }
  }, [input.selectedComponentId, input.removeComponent, libraryState.componentsByCollectionId, libraryState.isLoading]);

  useEffect(() => {
    if (!input.hasHydrated || input.hydrateStatus === "hydrating" || libraryState.isLoading) {
      return;
    }
    input.validateRestoredView({
      collections: libraryState.collections,
      componentsByCollectionId: libraryState.componentsByCollectionId
    });
  }, [
    input.hasHydrated,
    input.hydrateStatus,
    input.validateRestoredView,
    libraryState.collections,
    libraryState.componentsByCollectionId,
    libraryState.isLoading
  ]);

  return {
    libraryState,
    setLibraryState,
    statusMessage,
    setStatusMessage,
    refreshLibraryState
  };
}

function countComponents(componentsByCollectionId: Record<string, SavedComponent[]>): number {
  return Object.values(componentsByCollectionId).reduce((total, items) => total + items.length, 0);
}

function resolveSelectedCollectionId(input: {
  collections: Collection[];
  preferredCollectionId: string | null;
  preferenceCollectionId: string | null;
  defaultCollectionId: string;
}): string | null {
  const existingIds = new Set(input.collections.map((collection) => collection.id));
  const candidates = [input.preferredCollectionId, input.preferenceCollectionId, input.defaultCollectionId];
  for (const candidate of candidates) {
    if (candidate && existingIds.has(candidate)) {
      return candidate;
    }
  }
  return input.collections[0]?.id ?? null;
}

function upsertComponentAcrossBuckets(
  componentsByCollectionId: Record<string, SavedComponent[]>,
  component: SavedComponent
): Record<string, SavedComponent[]> {
  const nextComponentsByCollectionId: Record<string, SavedComponent[]> = {};
  for (const [collectionId, components] of Object.entries(componentsByCollectionId)) {
    nextComponentsByCollectionId[collectionId] = components.filter((candidate) => candidate.id !== component.id);
  }

  for (const collectionId of component.collectionIds) {
    const existing = nextComponentsByCollectionId[collectionId] ?? [];
    nextComponentsByCollectionId[collectionId] = sortComponentsByCapturedAt([component, ...existing]);
  }

  return nextComponentsByCollectionId;
}

function removeComponentFromBuckets(
  componentsByCollectionId: Record<string, SavedComponent[]>,
  componentId: string
): Record<string, SavedComponent[]> {
  let didRemoveAny = false;
  const nextComponentsByCollectionId: Record<string, SavedComponent[]> = {};
  for (const [collectionId, components] of Object.entries(componentsByCollectionId)) {
    const nextComponents = components.filter((candidate) => candidate.id !== componentId);
    if (nextComponents.length !== components.length) {
      didRemoveAny = true;
    }
    nextComponentsByCollectionId[collectionId] = nextComponents;
  }
  if (!didRemoveAny) {
    return componentsByCollectionId;
  }
  return nextComponentsByCollectionId;
}

function deleteCollectionFromBuckets(
  componentsByCollectionId: Record<string, SavedComponent[]>,
  remainingCollections: Collection[],
  deletedCollectionId: string
): Record<string, SavedComponent[]> {
  const componentsById = new Map<string, SavedComponent>();

  for (const components of Object.values(componentsByCollectionId)) {
    for (const component of components) {
      if (componentsById.has(component.id)) {
        continue;
      }
      const nextCollectionIds = component.collectionIds.filter((collectionId) => collectionId !== deletedCollectionId);
      if (nextCollectionIds.length === 0) {
        continue;
      }
      componentsById.set(component.id, {
        ...component,
        collectionIds: nextCollectionIds
      });
    }
  }

  const nextComponentsByCollectionId: Record<string, SavedComponent[]> = {};
  for (const collection of remainingCollections) {
    nextComponentsByCollectionId[collection.id] = [];
  }

  for (const component of componentsById.values()) {
    for (const collectionId of component.collectionIds) {
      if (!nextComponentsByCollectionId[collectionId]) {
        continue;
      }
      nextComponentsByCollectionId[collectionId].push(component);
    }
  }

  for (const collectionId of Object.keys(nextComponentsByCollectionId)) {
    nextComponentsByCollectionId[collectionId] = sortComponentsByCapturedAt(nextComponentsByCollectionId[collectionId]);
  }

  return nextComponentsByCollectionId;
}

function sortCollectionsByUpdatedAtUnique(collections: Collection[]): Collection[] {
  const seen = new Set<string>();
  const uniqueCollections = collections.filter((collection) => {
    if (seen.has(collection.id)) {
      return false;
    }
    seen.add(collection.id);
    return true;
  });
  return uniqueCollections.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

function sortComponentsByCapturedAt(components: SavedComponent[]): SavedComponent[] {
  return components.sort((left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime());
}
