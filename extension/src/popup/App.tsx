import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { isLibraryUpdatedMessage, type LibraryUpdatedMessage } from "@/lib/library/messages";
import { libraryRepository } from "@/lib/library/repository";
import type { Collection, SavedComponent } from "@/lib/library/types";
import { usePopupStore } from "./state/store";
import { CaptureHeader } from "./components/CaptureHeader";
import { CollectionRail } from "./components/library/CollectionRail";
import { LibraryGrid } from "./components/library/LibraryGrid";
import {
  getCaptureStartErrorMessage,
  getPreviewStartErrorMessage,
  isPopupCaptureSupportedUrl,
  startCapture,
  startPreview
} from "./lib/messages";
import { getLibraryPreferences, setSelectedCollectionPreference } from "./lib/library-preferences";

type LibraryViewState = {
  selectedCollectionId: string | null;
  collections: Collection[];
  componentsByCollectionId: Record<string, SavedComponent[]>;
  isLoading: boolean;
};

export function App() {
  const [libraryState, setLibraryState] = useState<LibraryViewState>({
    selectedCollectionId: null,
    collections: [],
    componentsByCollectionId: {},
    isLoading: true
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [isCaptureAvailable, setIsCaptureAvailable] = useState(true);
  const [isCaptureStarting, setIsCaptureStarting] = useState(false);
  const [isPreviewStarting, setIsPreviewStarting] = useState(false);
  const selectedCollectionId = usePopupStore((state) => state.selectedCollectionId);
  const selectedComponentId = usePopupStore((state) => state.selectedComponentId);
  const hasHydrated = usePopupStore((state) => state.hasHydrated);
  const hydrateStatus = usePopupStore((state) => state.hydrateStatus);
  const openCollection = usePopupStore((state) => state.openCollection);
  const openComponentCanvas = usePopupStore((state) => state.openComponentCanvas);
  const closeComponentCanvas = usePopupStore((state) => state.closeComponentCanvas);
  const markHydrated = usePopupStore((state) => state.markHydrated);
  const markHydrationError = usePopupStore((state) => state.markHydrationError);
  const removeComponent = usePopupStore((state) => state.removeComponent);
  const removeCollection = usePopupStore((state) => state.removeCollection);
  const validateRestoredView = usePopupStore((state) => state.validateRestoredView);

  useEffect(() => {
    let cancelled = false;

    const hydratePopupState = async (): Promise<void> => {
      try {
        await usePopupStore.persist.rehydrate();
        if (cancelled) {
          return;
        }
        markHydrated();
      } catch (error) {
        console.error("Failed to hydrate popup store:", error);
        if (cancelled) {
          return;
        }
        markHydrationError();
      }
    };

    void hydratePopupState();

    return () => {
      cancelled = true;
    };
  }, [markHydrated, markHydrationError]);

  useEffect(() => {
    let cancelled = false;

    const loadLibraryState = async (): Promise<void> => {
      setLibraryState((current) => ({
        ...current,
        isLoading: true
      }));
      await libraryRepository.initLibrary();
      const [preferences, meta, collections] = await Promise.all([
        getLibraryPreferences(),
        libraryRepository.getLibraryMeta(),
        libraryRepository.listCollections()
      ]);
      if (cancelled) {
        return;
      }

      const selectedCollectionId = resolveSelectedCollectionId({
        collections,
        preferredCollectionId: null,
        preferenceCollectionId: preferences.selectedCollectionId,
        defaultCollectionId: meta.defaultCollectionId
      });

      const componentsByCollectionId: Record<string, SavedComponent[]> = {};
      for (const collection of collections) {
        componentsByCollectionId[collection.id] = await libraryRepository.listComponents(collection.id);
      }
      if (cancelled) {
        return;
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

    void loadLibraryState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const listener = (message: unknown): void => {
      if (!isLibraryUpdatedMessage(message)) {
        return;
      }
      if (message.payload.event === "COLLECTION_UPDATED" && message.payload.collection) {
        setLibraryState((current) => ({
          ...current,
          collections: current.collections.map((collection) =>
            collection.id === message.payload.collection?.id ? message.payload.collection : collection
          )
        }));
        return;
      }
      void refreshLibraryState(selectedCollectionId, setLibraryState, setStatusMessage);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [selectedCollectionId]);

  useEffect(() => {
    let cancelled = false;

    const initializeCaptureAvailability = async (): Promise<void> => {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        const supported = isPopupCaptureSupportedUrl(activeTab?.url);
        if (cancelled) {
          return;
        }
        setIsCaptureAvailable(supported);
        if (!supported) {
          setStatusMessage("Capture is unavailable on this page. Open an http(s) page");
        }
      } catch (error) {
        console.error("Failed to check active tab before capture:", error);
      }
    };

    void initializeCaptureAvailability();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedComponentId) {
      return;
    }
    if (libraryState.isLoading) {
      return;
    }

    const exists = Object.values(libraryState.componentsByCollectionId)
      .flat()
      .some((component) => component.id === selectedComponentId);
    if (!exists) {
      removeComponent(selectedComponentId);
    }
  }, [libraryState.componentsByCollectionId, libraryState.isLoading, removeComponent, selectedComponentId]);

  useEffect(() => {
    if (!hasHydrated || libraryState.isLoading) {
      return;
    }
    validateRestoredView({
      collections: libraryState.collections,
      componentsByCollectionId: libraryState.componentsByCollectionId
    });
  }, [
    hasHydrated,
    libraryState.collections,
    libraryState.componentsByCollectionId,
    libraryState.isLoading,
    validateRestoredView
  ]);

  const handleCaptureStart = async (): Promise<void> => {
    const activeCollectionId = resolveActiveCollectionId({
      collections: libraryState.collections,
      selectedCollectionId,
      libraryStateSelectedCollectionId: libraryState.selectedCollectionId
    });
    if (!activeCollectionId) {
      setStatusMessage("Select a collection before starting capture.");
      return;
    }

    setIsCaptureStarting(true);
    setStatusMessage("Starting capture");

    try {
      await startCapture(activeCollectionId);
      setStatusMessage("Capture mode enabled on the active tab");
      window.close();
    } catch (error) {
      console.error("Failed to start capture:", error);
      setStatusMessage(getCaptureStartErrorMessage(error));
      setIsCaptureStarting(false);
    }
  };

  const handlePreviewStart = async (
    component: SavedComponent,
    activeCollectionIdFromUi: string | null
  ): Promise<void> => {
    const activeCollectionId = resolveActiveCollectionId({
      collections: libraryState.collections,
      selectedCollectionId,
      libraryStateSelectedCollectionId: libraryState.selectedCollectionId,
      activeCollectionIdFromUi
    });
    if (!activeCollectionId) {
      setStatusMessage("Select a collection before starting preview.");
      return;
    }

    setIsPreviewStarting(true);
    setStatusMessage("Starting preview");
    try {
      await startPreview(component, activeCollectionId);
      setStatusMessage("Preview mode enabled on the active tab");
      window.close();
    } catch (error) {
      console.error("Failed to start preview:", error);
      setStatusMessage(getPreviewStartErrorMessage(error));
      setIsPreviewStarting(false);
    }
  };

  const handleSelectCollection = async (collectionId: string): Promise<void> => {
    setLibraryState((current) => ({
      ...current,
      selectedCollectionId: collectionId
    }));
    openCollection(collectionId);
    await setSelectedCollectionPreference(collectionId);
  };

  const handleCreateCollection = async (input: {
    name: string;
    description?: string;
  }): Promise<void> => {
    try {
      const collection = await libraryRepository.createCollection({
        name: input.name,
        description: input.description
      });
      await notifyLibraryUpdated({
        type: "LIBRARY_UPDATED",
        payload: {
          event: "COLLECTION_CREATED",
          collection
        }
      });
      await refreshLibraryState(collection.id, setLibraryState, setStatusMessage);
      setStatusMessage(`Created collection "${collection.name}"`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not create collection");
    }
  };

  const handleUpdateCollection = async (
    collectionId: string,
    patch: Partial<Pick<Collection, "name" | "description">>
  ): Promise<void> => {
    try {
      const updatedCollection = await libraryRepository.updateCollection(collectionId, {
        ...patch
      });
      await notifyLibraryUpdated({
        type: "LIBRARY_UPDATED",
        payload: {
          event: "COLLECTION_UPDATED",
          collection: updatedCollection
        }
      });
      setLibraryState((current) => ({
        ...current,
        collections: current.collections.map((collection) =>
          collection.id === updatedCollection.id ? updatedCollection : collection
        )
      }));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not update collection");
    }
  };

  const handleDeleteCollection = async (collectionId: string): Promise<void> => {
    const collection = libraryState.collections.find((candidate) => candidate.id === collectionId);
    if (!collection || collection.isSystem) {
      return;
    }

    try {
      await libraryRepository.deleteCollection(collectionId);
      await notifyLibraryUpdated({
        type: "LIBRARY_UPDATED",
        payload: {
          event: "COLLECTION_DELETED",
          id: collectionId
        }
      });
      removeCollection(collectionId);
      await refreshLibraryState(null, setLibraryState, setStatusMessage);
      setStatusMessage(`Deleted "${collection.name}"`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not delete collection");
    }
  };

  const handleMoveComponentToCollection = async (
    componentId: string,
    targetCollectionId: string
  ): Promise<void> => {
    const sourceComponent = getComponentById(libraryState.componentsByCollectionId, componentId);
    if (!sourceComponent) {
      return;
    }

    const normalizedTargetCollectionId = targetCollectionId.trim();
    if (!normalizedTargetCollectionId || sourceComponent.collectionIds.includes(normalizedTargetCollectionId)) {
      return;
    }

    const hasTarget = libraryState.collections.some(
      (collection) => collection.id === normalizedTargetCollectionId
    );
    if (!hasTarget) {
      return;
    }
    try {
      const movedComponent = await libraryRepository.moveComponent(componentId, normalizedTargetCollectionId);
      await notifyLibraryUpdated({
        type: "LIBRARY_UPDATED",
        payload: {
          event: "COMPONENT_MOVED",
          component: movedComponent
        }
      });
      await refreshLibraryState(selectedCollectionId, setLibraryState, setStatusMessage);
      setStatusMessage("Component added to collection");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not add component to collection");
    }
  };

  const handleDeleteComponent = async (componentId: string): Promise<void> => {
    const sourceComponent = getComponentById(libraryState.componentsByCollectionId, componentId);
    if (!sourceComponent) {
      return;
    }

    try {
      await libraryRepository.deleteComponent(componentId);
      await notifyLibraryUpdated({
        type: "LIBRARY_UPDATED",
        payload: {
          event: "COMPONENT_DELETED",
          id: componentId,
          collectionId: sourceComponent.collectionIds[0]
        }
      });
      await refreshLibraryState(selectedCollectionId, setLibraryState, setStatusMessage);
      removeComponent(componentId);
      setStatusMessage("Component deleted");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not delete component");
    }
  };

  const effectiveSelectedCollectionId = selectedCollectionId ?? libraryState.selectedCollectionId;
  const selectedCollection =
    libraryState.collections.find((collection) => collection.id === effectiveSelectedCollectionId) ?? null;
  const selectedComponents = effectiveSelectedCollectionId
    ? libraryState.componentsByCollectionId[effectiveSelectedCollectionId] ?? []
    : [];
  const componentCounts = mapComponentCounts(libraryState.componentsByCollectionId);
  const activeComponent = selectedComponentId
    ? getComponentById(libraryState.componentsByCollectionId, selectedComponentId)
    : null;

  const isHydratingPopupState = !hasHydrated || hydrateStatus === "hydrating";
  if (isHydratingPopupState) {
    return (
      <main className="flex h-popup-h w-full max-w-full items-center justify-center overflow-x-hidden bg-surface p-4">
        <p className="text-xs text-muted-foreground">Restoring last view...</p>
      </main>
    );
  }

  const isLoadingLibrary = libraryState.isLoading && libraryState.collections.length === 0;
  if (isLoadingLibrary) {
    return (
      <main className="flex h-popup-h w-full max-w-full items-center justify-center overflow-x-hidden bg-surface p-4">
        <p className="text-xs text-muted-foreground">Loading library...</p>
      </main>
    );
  }

  return (
    <main className="flex h-popup-h w-full max-w-full flex-col overflow-hidden border border-border bg-background">
      <CaptureHeader
        isCaptureDisabled={!isCaptureAvailable || isCaptureStarting}
        onStartCapture={handleCaptureStart}
        statusMessage={statusMessage}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <CollectionRail
          collections={libraryState.collections}
          selectedCollectionId={effectiveSelectedCollectionId}
          componentCounts={componentCounts}
          onSelectCollection={(collectionId) => {
            void handleSelectCollection(collectionId);
          }}
          onDeleteCollection={(collectionId) => {
            void handleDeleteCollection(collectionId);
          }}
          onCreateCollection={async (input) => {
            await handleCreateCollection(input);
          }}
          onUpdateCollection={async (collectionId, patch) => {
            await handleUpdateCollection(collectionId, patch);
          }}
        />

        <LibraryGrid
          collection={selectedCollection}
          collections={libraryState.collections}
          components={selectedComponents}
          activeCollectionId={effectiveSelectedCollectionId}
          activeComponent={activeComponent}
          isPreviewStarting={isPreviewStarting}
          onStartPreview={(component, activeCollectionId) => {
            void handlePreviewStart(component, activeCollectionId);
          }}
          onOpenDetails={(componentId) => {
            const activeCollectionId = effectiveSelectedCollectionId;
            if (!activeCollectionId) {
              return;
            }
            openComponentCanvas(activeCollectionId, componentId);
          }}
          onCloseDetails={() => {
            closeComponentCanvas();
          }}
          onMoveComponentToCollection={(componentId, targetCollectionId) => {
            void handleMoveComponentToCollection(componentId, targetCollectionId);
          }}
          onDeleteComponent={(componentId) => {
            void handleDeleteComponent(componentId);
          }}
          onDeleteCollection={(collectionId) => {
            void handleDeleteCollection(collectionId);
          }}
        />
      </div>
    </main>
  );
}

async function notifyLibraryUpdated(message: LibraryUpdatedMessage): Promise<void> {
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    // Ignore when no listeners are active.
  }
}

async function refreshLibraryState(
  preferredCollectionId: string | null,
  setLibraryState: Dispatch<SetStateAction<LibraryViewState>>,
  setStatusMessage: Dispatch<SetStateAction<string>>
): Promise<void> {
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
}

function countComponents(componentsByCollectionId: Record<string, SavedComponent[]>): number {
  return Object.values(componentsByCollectionId).reduce((total, items) => total + items.length, 0);
}

function mapComponentCounts(
  componentsByCollectionId: Record<string, SavedComponent[]>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [collectionId, components] of Object.entries(componentsByCollectionId)) {
    counts[collectionId] = components.length;
  }
  return counts;
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

function resolveActiveCollectionId(input: {
  collections: Collection[];
  selectedCollectionId: string | null;
  libraryStateSelectedCollectionId: string | null;
  activeCollectionIdFromUi?: string | null;
}): string | null {
  const existingIds = new Set(input.collections.map((collection) => collection.id));
  const candidates = [
    input.activeCollectionIdFromUi,
    input.selectedCollectionId,
    input.libraryStateSelectedCollectionId
  ];
  for (const candidate of candidates) {
    if (candidate && existingIds.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

function getComponentById(
  componentsByCollectionId: Record<string, SavedComponent[]>,
  componentId: string
): SavedComponent | null {
  for (const components of Object.values(componentsByCollectionId)) {
    const match = components.find((candidate) => candidate.id === componentId);
    if (match) {
      return match;
    }
  }
  return null;
}
