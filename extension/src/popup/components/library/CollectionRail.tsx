import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Collection } from "@/lib/library/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { CollectionCard } from "./CollectionCard";

type CollectionRailProps = {
  collections: Collection[];
  selectedCollectionId: string | null;
  componentCounts: Record<string, number>;
  onSelectCollection: (collectionId: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onCreateCollection: (input: { name: string; description?: string }) => Promise<void>;
  onUpdateCollection: (
    collectionId: string,
    patch: Partial<Pick<Collection, "name" | "description">>
  ) => Promise<void>;
};

type CollectionDraft = {
  name: string;
  description: string;
  isDirty: boolean;
  isEditing: boolean;
};

const COLLECTION_DRAFT_SAVE_DEBOUNCE_MS = 300;

export function CollectionRail({
  collections,
  selectedCollectionId,
  componentCounts,
  onSelectCollection,
  onDeleteCollection,
  onCreateCollection,
  onUpdateCollection
}: CollectionRailProps) {
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [draftsById, setDraftsById] = useState<Record<string, CollectionDraft>>({});
  const [isCreateFormVisible, setIsCreateFormVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingRenameCollectionId, setPendingRenameCollectionId] = useState<string | null>(null);
  const saveTimeoutByIdRef = useRef<Record<string, number>>({});
  const draftsByIdRef = useRef<Record<string, CollectionDraft>>({});
  const collectionsRef = useRef<Collection[]>(collections);

  const normalizedCollections = useMemo(
    () =>
      collections.map((collection) => ({
        ...collection,
        name: collection.name,
        description: collection.description
      })),
    [collections]
  );

  useEffect(() => {
    setDraftsById((current) => {
      const nextDrafts: Record<string, CollectionDraft> = {};
      for (const collection of normalizedCollections) {
        const existing = current[collection.id];
        if (existing && (existing.isDirty || existing.isEditing)) {
          nextDrafts[collection.id] = existing;
          continue;
        }
        nextDrafts[collection.id] = {
          name: collection.name,
          description: collection.description,
          isDirty: false,
          isEditing: false
        };
      }
      return nextDrafts;
    });
  }, [normalizedCollections]);

  useEffect(() => {
    draftsByIdRef.current = draftsById;
  }, [draftsById]);

  useEffect(() => {
    collectionsRef.current = collections;
  }, [collections]);

  useEffect(() => {
    return () => {
      for (const timeoutId of Object.values(saveTimeoutByIdRef.current)) {
        window.clearTimeout(timeoutId);
      }
      saveTimeoutByIdRef.current = {};
    };
  }, []);

  const clearScheduledSave = (collectionId: string): void => {
    const existingTimeout = saveTimeoutByIdRef.current[collectionId];
    if (typeof existingTimeout === "number") {
      window.clearTimeout(existingTimeout);
      delete saveTimeoutByIdRef.current[collectionId];
    }
  };

  const scheduleSave = (collectionId: string): void => {
    clearScheduledSave(collectionId);
    saveTimeoutByIdRef.current[collectionId] = window.setTimeout(() => {
      void flushSave(collectionId);
    }, COLLECTION_DRAFT_SAVE_DEBOUNCE_MS);
  };

  const flushSave = async (collectionId: string): Promise<void> => {
    clearScheduledSave(collectionId);

    const draft = draftsByIdRef.current[collectionId];
    const source = collectionsRef.current.find((collection) => collection.id === collectionId);
    if (!draft || !source) {
      return;
    }

    const nextName = draft.name.trim();
    const nextDescription = draft.description.trim();
    if (nextName === source.name && nextDescription === source.description) {
      setDraftsById((current) => {
        const existing = current[collectionId];
        if (!existing) {
          return current;
        }
        return {
          ...current,
          [collectionId]: {
            name: source.name,
            description: source.description,
            isDirty: false,
            isEditing: existing.isEditing
          }
        };
      });
      return;
    }

    await onUpdateCollection(collectionId, {
      name: nextName,
      description: nextDescription
    });

    setDraftsById((current) => {
      const existing = current[collectionId];
      if (!existing) {
        return current;
      }
      return {
        ...current,
        [collectionId]: {
          name: nextName,
          description: nextDescription,
          isDirty: false,
          isEditing: existing.isEditing
        }
      };
    });
  };

  const handleCreate = async (): Promise<void> => {
    const name = newCollectionName.trim();
    const description = newCollectionDescription.trim();
    if (!name || isCreating) {
      return;
    }
    setIsCreating(true);
    try {
      await onCreateCollection({
        name,
        description
      });
      setNewCollectionName("");
      setNewCollectionDescription("");
      setIsCreateFormVisible(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="flex h-full min-h-0 w-rail-w min-w-rail-w flex-col border-r border-border bg-surface/80 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <div className="min-w-0">
          <h2 className="truncate text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Library</h2>
          <p className="truncate text-[11px] text-muted-foreground">{collections.length} collections</p>
        </div>
      </div>

      {isCreateFormVisible ? (
        <div className="mb-1.5 grid gap-1 rounded-md border border-border bg-background p-1">
          <input
            value={newCollectionName}
            onChange={(event) => {
              setNewCollectionName(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
            className="h-6 rounded-md border border-transparent px-1.5 text-[12px] font-medium text-foreground outline-none transition-colors hover:cursor-text hover:border-border-strong focus-visible:border-secondary"
            placeholder="New collection name"
            autoFocus
          />
          <input
            value={newCollectionDescription}
            onChange={(event) => {
              setNewCollectionDescription(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
            className="h-6 rounded-md border border-transparent px-1.5 text-[11px] text-muted-foreground outline-none transition-colors hover:cursor-text hover:border-border-strong focus-visible:border-secondary"
            placeholder="Description (optional)"
          />
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              className="h-7 flex-1 px-2 text-[11px]"
              disabled={!newCollectionName.trim() || isCreating}
              onClick={() => void handleCreate()}
            >
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 flex-1 px-2 text-[11px]"
              onClick={() => {
                setIsCreateFormVisible(false);
                setNewCollectionName("");
                setNewCollectionDescription("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          className="mb-1.5 h-7 w-full hover:bg-primary hover:text-white px-2 text-[11px] text-blue-800 bg-blue-200 cursor-pointer"
          onClick={() => {
            setIsCreateFormVisible(true);
          }}
        >
          New collection
        </Button>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <ul className="grid w-full gap-1">
          {collections.map((collection) => {
            const isSelected = collection.id === selectedCollectionId;
            const count = componentCounts[collection.id] ?? 0;
            const draft = draftsById[collection.id] ?? {
              name: collection.name,
              description: collection.description
            };
            return (
              <CollectionCard
                key={collection.id}
                collection={collection}
                isSelected={isSelected}
                count={count}
                draft={draft}
                onSelect={() => {
                  onSelectCollection(collection.id);
                }}
                onRequestRename={() => {
                  onSelectCollection(collection.id);
                  setPendingRenameCollectionId(collection.id);
                }}
                onDelete={() => {
                  onDeleteCollection(collection.id);
                }}
                shouldFocusNameInput={pendingRenameCollectionId === collection.id}
                onNameFocusHandled={() => {
                  if (pendingRenameCollectionId === collection.id) {
                    setPendingRenameCollectionId(null);
                  }
                }}
                onChangeName={(name) => {
                  setDraftsById((current) => ({
                    ...current,
                    [collection.id]: {
                      ...(current[collection.id] ?? {
                        name: collection.name,
                        description: collection.description,
                        isDirty: false,
                        isEditing: false
                      }),
                      name,
                      isDirty: true
                    }
                  }));
                  scheduleSave(collection.id);
                }}
                onChangeDescription={(description) => {
                  setDraftsById((current) => ({
                    ...current,
                    [collection.id]: {
                      ...(current[collection.id] ?? {
                        name: collection.name,
                        description: collection.description,
                        isDirty: false,
                        isEditing: false
                      }),
                      description,
                      isDirty: true
                    }
                  }));
                  scheduleSave(collection.id);
                }}
                onFocusDraft={() => {
                  setDraftsById((current) => {
                    const existing = current[collection.id];
                    if (!existing) {
                      return current;
                    }
                    if (existing.isEditing) {
                      return current;
                    }
                    return {
                      ...current,
                      [collection.id]: {
                        ...existing,
                        isEditing: true
                      }
                    };
                  });
                }}
                onBlurDraft={() => {
                  setDraftsById((current) => {
                    const existing = current[collection.id];
                    if (!existing || !existing.isEditing) {
                      return current;
                    }
                    return {
                      ...current,
                      [collection.id]: {
                        ...existing,
                        isEditing: false
                      }
                    };
                  });
                  void flushSave(collection.id);
                }}
              />
            );
          })}
        </ul>
      </ScrollArea>
    </aside>
  );
}
