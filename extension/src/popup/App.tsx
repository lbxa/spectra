import { useEffect, useState } from "react";
import { ChromeRuntimeEventPublisher } from "@/lib/events/chrome-runtime-event-publisher";
import { LibraryApplicationService } from "@/lib/library/application-service";
import { libraryRepository } from "@/lib/library/repository";
import type { Collection, SavedComponent, SavedPreview, SavedPreviewListItem } from "@/lib/library/types";
import { normalizePathname } from "@/lib/preview/pathname";
import { applySavedPreviewOnActiveTab, listSavedPreviewsForPage } from "./lib/messages";
import { useCapturePreviewActions } from "./hooks/use-capture-preview-actions";
import { useLibraryState } from "./hooks/use-library-state";
import { setSelectedCollectionPreference } from "./lib/library-preferences";
import { usePopupStore } from "./state/store";
import { CaptureHeader } from "./components/CaptureHeader";
import { WorkspaceShell } from "./components/WorkspaceShell";
import { CollectionRail } from "./components/library/CollectionRail";
import { LibraryGrid } from "./components/library/LibraryGrid";
import { PreviewCanvas } from "./components/previews/PreviewCanvas";
import { PreviewsSidebar } from "./components/previews/PreviewsSidebar";

const libraryApplicationService = new LibraryApplicationService(libraryRepository, new ChromeRuntimeEventPublisher());

export function App() {
  const [previews, setPreviews] = useState<SavedPreviewListItem[]>([]);
  const [activePreviewPageKey, setActivePreviewPageKey] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<SavedPreview | null>(null);
  const [previewComponentsById, setPreviewComponentsById] = useState<Map<string, SavedComponent>>(new Map());
  const [isPreviewApplyPending, setIsPreviewApplyPending] = useState(false);
  const selectedCollectionId = usePopupStore((state) => state.selectedCollectionId);
  const selectedComponentId = usePopupStore((state) => state.selectedComponentId);
  const activeSpace = usePopupStore((state) => state.activeSpace);
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
  const setActiveSpace = usePopupStore((state) => state.setActiveSpace);
  const lastVisitedPreviewByPageKey = usePopupStore((state) => state.lastVisitedPreviewByPageKey);
  const setLastVisitedPreview = usePopupStore((state) => state.setLastVisitedPreview);
  const clearLastVisitedPreview = usePopupStore((state) => state.clearLastVisitedPreview);
  const getLastVisitedPreview = usePopupStore((state) => state.getLastVisitedPreview);

  const selectedPreviewId = activePreviewPageKey
    ? (lastVisitedPreviewByPageKey[activePreviewPageKey] ?? null)
    : null;

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

  const { libraryState, setLibraryState, statusMessage, setStatusMessage } = useLibraryState({
    selectedCollectionId,
    selectedComponentId,
    hasHydrated,
    hydrateStatus,
    removeComponent,
    validateRestoredView
  });

  const { isCaptureAvailable, isCaptureStarting, isPreviewStarting, handleCaptureStart, handlePreviewStart } =
    useCapturePreviewActions({
      collections: libraryState.collections,
      selectedCollectionId,
      libraryStateSelectedCollectionId: libraryState.selectedCollectionId,
      setStatusMessage
    });

  useEffect(() => {
    if (activeSpace !== "previews") {
      return;
    }
    let cancelled = false;
    const loadPreviews = async (): Promise<void> => {
      try {
        const pageTarget = await resolveActiveTabTarget();
        if (!pageTarget) {
          if (!cancelled) {
            setActivePreviewPageKey(null);
            setPreviews([]);
            setSelectedPreview(null);
            setPreviewComponentsById(new Map());
          }
          return;
        }
        const pageKey = toPreviewPageKey(pageTarget);
        const response = await listSavedPreviewsForPage(pageTarget.origin, pageTarget.pathname);
        if (cancelled) {
          return;
        }
        setActivePreviewPageKey(pageKey);
        setPreviews(response.previews);
        const lastVisitedPreviewId = getLastVisitedPreview(pageKey);
        const resolvedSelectedPreviewId = lastVisitedPreviewId && response.previews.some((preview) => preview.id === lastVisitedPreviewId)
          ? lastVisitedPreviewId
          : (response.previews[0]?.id ?? null);

        if (resolvedSelectedPreviewId) {
          setLastVisitedPreview(pageKey, resolvedSelectedPreviewId);
        } else {
          clearLastVisitedPreview(pageKey);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to load saved previews:", error);
        setStatusMessage(error instanceof Error ? error.message : "Could not load saved previews");
        setPreviews([]);
      }
    };

    void loadPreviews();
    return () => {
      cancelled = true;
    };
  }, [activeSpace, clearLastVisitedPreview, getLastVisitedPreview, setLastVisitedPreview, setStatusMessage]);

  useEffect(() => {
    if (activeSpace !== "previews" || !selectedPreviewId) {
      setSelectedPreview(null);
      setPreviewComponentsById(new Map());
      return;
    }
    let cancelled = false;
    const loadSelectedPreview = async (): Promise<void> => {
      try {
        await libraryRepository.initLibrary();
        const preview = await libraryRepository.getSavedPreview(selectedPreviewId);
        if (cancelled) {
          return;
        }
        if (!preview) {
          setSelectedPreview(null);
          setPreviewComponentsById(new Map());
          return;
        }
        const components = await Promise.all(
          preview.instances.map(async (instance) => libraryRepository.getComponent(instance.componentId))
        );
        if (cancelled) {
          return;
        }
        setSelectedPreview(preview);
        setPreviewComponentsById(
          new Map(
            components
              .filter((component): component is SavedComponent => component !== null)
              .map((component) => [component.id, component] as const)
          )
        );
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to hydrate selected saved preview:", error);
        setStatusMessage(error instanceof Error ? error.message : "Could not load preview details");
        setSelectedPreview(null);
        setPreviewComponentsById(new Map());
      }
    };

    void loadSelectedPreview();
    return () => {
      cancelled = true;
    };
  }, [activeSpace, selectedPreviewId, setStatusMessage]);

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
      const collection = await libraryApplicationService.createCollection({
        name: input.name,
        description: input.description
      });
      setLibraryState((current) => ({
        ...current,
        selectedCollectionId: collection.id,
        collections: sortCollectionsByUpdatedAtUnique([collection, ...current.collections]),
        componentsByCollectionId: {
          ...current.componentsByCollectionId,
          [collection.id]: current.componentsByCollectionId[collection.id] ?? []
        }
      }));
      openCollection(collection.id);
      await setSelectedCollectionPreference(collection.id);
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
      const updatedCollection = await libraryApplicationService.updateCollection(collectionId, {
        ...patch
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
      await libraryApplicationService.deleteCollection(collectionId);
      setLibraryState((current) => {
        const nextCollections = current.collections.filter((candidate) => candidate.id !== collectionId);
        const nextComponentsByCollectionId = deleteCollectionFromBuckets(
          current.componentsByCollectionId,
          nextCollections,
          collectionId
        );
        const nextSelectedCollectionId =
          current.selectedCollectionId === collectionId
            ? (nextCollections[0]?.id ?? null)
            : current.selectedCollectionId;
        return {
          ...current,
          selectedCollectionId: nextSelectedCollectionId,
          collections: nextCollections,
          componentsByCollectionId: nextComponentsByCollectionId
        };
      });
      removeCollection(collectionId);
      setStatusMessage(`Deleted "${collection.name}"`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not delete collection");
    }
  };

  const handleCopyComponentToCollection = async (
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
      const copiedComponent = await libraryApplicationService.copyComponentToCollection(
        componentId,
        normalizedTargetCollectionId
      );
      setLibraryState((current) => ({
        ...current,
        componentsByCollectionId: upsertComponentAcrossBuckets(current.componentsByCollectionId, copiedComponent)
      }));
      setStatusMessage("Component copied to collection");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not copy component to collection");
    }
  };

  const handleMoveComponentToCollection = async (
    componentId: string,
    sourceCollectionId: string,
    targetCollectionId: string
  ): Promise<void> => {
    const sourceComponent = getComponentById(libraryState.componentsByCollectionId, componentId);
    if (!sourceComponent) {
      return;
    }

    const normalizedSourceCollectionId = sourceCollectionId.trim();
    const normalizedTargetCollectionId = targetCollectionId.trim();
    if (
      !normalizedSourceCollectionId ||
      !normalizedTargetCollectionId ||
      normalizedSourceCollectionId === normalizedTargetCollectionId ||
      !sourceComponent.collectionIds.includes(normalizedSourceCollectionId)
    ) {
      return;
    }

    const hasTarget = libraryState.collections.some(
      (collection) => collection.id === normalizedTargetCollectionId
    );
    if (!hasTarget) {
      return;
    }
    try {
      const movedComponent = await libraryApplicationService.moveComponentToCollection(
        componentId,
        normalizedSourceCollectionId,
        normalizedTargetCollectionId
      );
      setLibraryState((current) => ({
        ...current,
        componentsByCollectionId: upsertComponentAcrossBuckets(current.componentsByCollectionId, movedComponent)
      }));
      setStatusMessage("Component moved to collection");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not move component to collection");
    }
  };

  const handleDeleteComponent = async (componentId: string): Promise<void> => {
    const sourceComponent = getComponentById(libraryState.componentsByCollectionId, componentId);
    if (!sourceComponent) {
      return;
    }

    try {
      await libraryApplicationService.deleteComponent(componentId, sourceComponent.collectionIds[0]);
      setLibraryState((current) => ({
        ...current,
        componentsByCollectionId: removeComponentFromBuckets(current.componentsByCollectionId, componentId)
      }));
      removeComponent(componentId);
      setStatusMessage("Component deleted");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not delete component");
    }
  };

  const handleApplySavedPreview = async (): Promise<void> => {
    if (!selectedPreviewId) {
      return;
    }
    setIsPreviewApplyPending(true);
    try {
      await applySavedPreviewOnActiveTab(selectedPreviewId);
      setStatusMessage("Applied saved preview on active tab");
      window.close();
    } catch (error) {
      console.error("Failed to apply saved preview:", error);
      setStatusMessage(error instanceof Error ? error.message : "Could not apply saved preview");
    } finally {
      setIsPreviewApplyPending(false);
    }
  };

  const handleSelectPreview = (previewId: string): void => {
    if (!activePreviewPageKey) {
      return;
    }
    setLastVisitedPreview(activePreviewPageKey, previewId);
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
        activeSpace={activeSpace}
        onActiveSpaceChange={setActiveSpace}
      />

      {activeSpace === "library" ? (
        <WorkspaceShell
          sidebar={
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
          }
          stage={
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
              onCopyComponentToCollection={(componentId, targetCollectionId) => {
                void handleCopyComponentToCollection(componentId, targetCollectionId);
              }}
              onMoveComponentToCollection={(componentId, sourceCollectionId, targetCollectionId) => {
                void handleMoveComponentToCollection(componentId, sourceCollectionId, targetCollectionId);
              }}
              onDeleteComponent={(componentId) => {
                void handleDeleteComponent(componentId);
              }}
              onDeleteCollection={(collectionId) => {
                void handleDeleteCollection(collectionId);
              }}
            />
          }
        />
      ) : (
        <WorkspaceShell
          sidebar={
            <PreviewsSidebar
              previews={previews}
              selectedPreviewId={selectedPreview?.id ?? selectedPreviewId}
              onSelectPreview={handleSelectPreview}
            />
          }
          stage={
            <PreviewCanvas
              preview={selectedPreview}
              componentsById={previewComponentsById}
              isApplyDisabled={isPreviewApplyPending}
              onApplyPreview={() => {
                void handleApplySavedPreview();
              }}
            />
          }
        />
      )}
    </main>
  );
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

function sortComponentsByCapturedAt(components: SavedComponent[]): SavedComponent[] {
  return components.sort((left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime());
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

async function resolveActiveTabTarget(): Promise<{ origin: string; pathname: string } | null> {
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!activeTab?.url) {
    return null;
  }
  try {
    const parsed = new URL(activeTab.url);
    return {
      origin: parsed.origin,
      pathname: normalizePathname(parsed.pathname)
    };
  } catch {
    return null;
  }
}

function toPreviewPageKey(target: { origin: string; pathname: string }): string {
  return `${target.origin}${target.pathname}`;
}

