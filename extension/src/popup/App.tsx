import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { isLibraryUpdatedMessage, type LibraryUpdatedMessage } from "@/lib/library/messages";
import { libraryRepository } from "@/lib/library/repository";
import type { Collection, SavedComponent } from "@/lib/library/types";
import { CaptureHeader } from "./components/CaptureHeader";
import { CollectionRail } from "./components/library/CollectionRail";
import { ComponentDetailModal } from "./components/library/ComponentDetailModal";
import { LibraryGrid } from "./components/library/LibraryGrid";
import { getCaptureStartErrorMessage, isPopupCaptureSupportedUrl, startCapture } from "./lib/messages";
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
  const [activeComponentId, setActiveComponentId] = useState<string | null>(null);

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
      void refreshLibraryState(libraryState.selectedCollectionId, setLibraryState, setStatusMessage);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [libraryState.selectedCollectionId]);

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
    if (!activeComponentId) {
      return;
    }

    const exists = Object.values(libraryState.componentsByCollectionId)
      .flat()
      .some((component) => component.id === activeComponentId);
    if (!exists) {
      setActiveComponentId(null);
    }
  }, [activeComponentId, libraryState.componentsByCollectionId]);

  const handleCaptureStart = async (): Promise<void> => {
    setIsCaptureStarting(true);
    setStatusMessage("Starting capture");

    try {
      await startCapture();
      setStatusMessage("Capture mode enabled on the active tab");
      window.close();
    } catch (error) {
      console.error("Failed to start capture:", error);
      setStatusMessage(getCaptureStartErrorMessage(error));
      setIsCaptureStarting(false);
    }
  };

  const handleSelectCollection = async (collectionId: string): Promise<void> => {
    setLibraryState((current) => ({
      ...current,
      selectedCollectionId: collectionId
    }));
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
    if (!normalizedTargetCollectionId || normalizedTargetCollectionId === sourceComponent.collectionId) {
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
      await refreshLibraryState(libraryState.selectedCollectionId, setLibraryState, setStatusMessage);
      setStatusMessage("Component moved");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not move component");
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
          collectionId: sourceComponent.collectionId
        }
      });
      await refreshLibraryState(libraryState.selectedCollectionId, setLibraryState, setStatusMessage);
      setStatusMessage("Component deleted");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not delete component");
    }
  };

  const selectedCollection =
    libraryState.collections.find((collection) => collection.id === libraryState.selectedCollectionId) ?? null;
  const selectedComponents =
    (libraryState.selectedCollectionId && libraryState.componentsByCollectionId[libraryState.selectedCollectionId]) ||
    [];
  const componentCounts = mapComponentCounts(libraryState.componentsByCollectionId);
  const activeComponent = activeComponentId
    ? getComponentById(libraryState.componentsByCollectionId, activeComponentId)
    : null;

  const isLoadingLibrary = libraryState.isLoading && libraryState.collections.length === 0;
  if (isLoadingLibrary) {
    return (
      <main className="flex h-[560px] w-full max-w-full items-center justify-center overflow-x-hidden bg-surface p-4">
        <p className="text-xs text-muted-foreground">Loading library...</p>
      </main>
    );
  }

  return (
    <main className="flex h-[560px] w-full max-w-full flex-col overflow-hidden border border-border bg-background">
      <CaptureHeader
        isCaptureDisabled={!isCaptureAvailable || isCaptureStarting}
        onStartCapture={handleCaptureStart}
        statusMessage={statusMessage}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <CollectionRail
          collections={libraryState.collections}
          selectedCollectionId={libraryState.selectedCollectionId}
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
          onOpenDetails={setActiveComponentId}
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

      {activeComponent ? (
        <ComponentDetailModal
          component={activeComponent}
          onClose={() => {
            setActiveComponentId(null);
          }}
        />
      ) : null}
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
