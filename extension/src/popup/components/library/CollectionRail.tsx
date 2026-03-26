import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/library/types";
import { useEffect, useMemo, useRef, useState } from "react";

type CollectionRailProps = {
  collections: Collection[];
  selectedCollectionId: string | null;
  componentCounts: Record<string, number>;
  onSelectCollection: (collectionId: string) => void;
  onCreateCollection: (input: { name: string; description?: string }) => Promise<void>;
  onUpdateCollection: (
    collectionId: string,
    patch: Partial<Pick<Collection, "name" | "description">>
  ) => Promise<void>;
  onDeleteCollection: (collectionId: string) => void;
};

export function CollectionRail({
  collections,
  selectedCollectionId,
  componentCounts,
  onSelectCollection,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection
}: CollectionRailProps) {
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [draftsById, setDraftsById] = useState<Record<string, { name: string; description: string }>>({});
  const [isCreateFormVisible, setIsCreateFormVisible] = useState(false);
  const [pendingDeleteCollectionId, setPendingDeleteCollectionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const saveTimeoutByIdRef = useRef<Record<string, number>>({});

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
    const nextDrafts: Record<string, { name: string; description: string }> = {};
    for (const collection of normalizedCollections) {
      nextDrafts[collection.id] = {
        name: collection.name,
        description: collection.description
      };
    }
    setDraftsById(nextDrafts);
  }, [normalizedCollections]);

  const scheduleSave = (collectionId: string): void => {
    const existingTimeout = saveTimeoutByIdRef.current[collectionId];
    if (typeof existingTimeout === "number") {
      window.clearTimeout(existingTimeout);
    }
    saveTimeoutByIdRef.current[collectionId] = window.setTimeout(() => {
      void flushSave(collectionId);
    }, 500);
  };

  const flushSave = async (collectionId: string): Promise<void> => {
    const draft = draftsById[collectionId];
    const source = collections.find((collection) => collection.id === collectionId);
    if (!draft || !source) {
      return;
    }
    const nextName = draft.name.trim();
    const nextDescription = draft.description.trim();
    if (nextName === source.name && nextDescription === source.description) {
      return;
    }
    await onUpdateCollection(collectionId, {
      name: nextName,
      description: nextDescription
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
    <aside className="flex h-full min-h-0 w-[220px] min-w-[220px] flex-col border-r border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">Library</h2>
          <p className="truncate text-[11px] text-slate-500">{collections.length} collections</p>
        </div>
      </div>

      {isCreateFormVisible ? (
        <div className="mb-3 grid gap-1.5 rounded-md border border-slate-200 bg-white p-2">
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
            className="h-7 rounded-md border border-transparent px-2 text-[12px] font-medium text-slate-900 outline-none transition-colors hover:cursor-text hover:border-slate-300 focus-visible:border-slate-400"
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
            className="h-7 rounded-md border border-transparent px-2 text-[11px] text-slate-600 outline-none transition-colors hover:cursor-text hover:border-slate-300 focus-visible:border-slate-400"
            placeholder="Description (optional)"
          />
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={!newCollectionName.trim() || isCreating}
              onClick={() => void handleCreate()}
            >
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1"
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
          className="mb-3 w-full"
          onClick={() => {
            setIsCreateFormVisible(true);
          }}
        >
          New collection
        </Button>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <ul className="grid w-full gap-1.5">
          {collections.map((collection) => {
            const isSelected = collection.id === selectedCollectionId;
            const count = componentCounts[collection.id] ?? 0;
            const draft = draftsById[collection.id] ?? {
              name: collection.name,
              description: collection.description
            };
            return (
              <li key={collection.id} className="group w-full">
                <button
                  type="button"
                  onClick={() => {
                    onSelectCollection(collection.id);
                  }}
                  className={cn(
                    "flex w-full items-start justify-between gap-2 rounded-md border px-2 py-2 text-left transition-colors",
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
                  )}
                >
                  <span className="grid min-w-0 flex-1 gap-1">
                    <input
                      value={draft.name}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      onChange={(event) => {
                        const nextName = event.target.value;
                        setDraftsById((current) => ({
                          ...current,
                          [collection.id]: {
                            ...current[collection.id],
                            name: nextName
                          }
                        }));
                        scheduleSave(collection.id);
                      }}
                      onBlur={() => {
                        void flushSave(collection.id);
                      }}
                      className={cn(
                        "h-6 rounded-md border border-transparent px-1.5 text-[12px] font-medium outline-none transition-colors hover:cursor-text hover:border-slate-300 focus-visible:border-slate-400",
                        isSelected ? "text-white placeholder:text-slate-300" : "text-slate-900"
                      )}
                    />
                    <input
                      value={draft.description}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      onChange={(event) => {
                        const nextDescription = event.target.value;
                        setDraftsById((current) => ({
                          ...current,
                          [collection.id]: {
                            ...current[collection.id],
                            description: nextDescription
                          }
                        }));
                        scheduleSave(collection.id);
                      }}
                      onBlur={() => {
                        void flushSave(collection.id);
                      }}
                      className={cn(
                        "h-6 rounded-md border border-transparent px-1.5 text-[10px] outline-none transition-colors hover:cursor-text hover:border-slate-300 focus-visible:border-slate-400",
                        isSelected ? "text-slate-300 placeholder:text-slate-300" : "text-slate-500"
                      )}
                      placeholder="No description"
                    />
                  </span>
                  <Badge
                    className={cn(
                      "shrink-0 rounded-md border-transparent px-1.5 py-0 text-[10px]",
                      isSelected ? "bg-slate-800 text-slate-100" : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {count}
                  </Badge>
                </button>
                <div className="mt-1 flex w-full justify-end gap-1 opacity-90 transition-opacity group-hover:opacity-100">
                  <Popover
                    open={pendingDeleteCollectionId === collection.id}
                    onOpenChange={(open) => {
                      setPendingDeleteCollectionId(open ? collection.id : null);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        disabled={collection.isSystem}
                      >
                        Delete
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-56">
                      <p className="mb-2 text-[11px] text-slate-700">
                        Delete <span className="font-semibold">{collection.name}</span>? Components move to Inbox.
                      </p>
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setPendingDeleteCollectionId(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1 bg-red-600 text-white hover:bg-red-700"
                          onClick={() => {
                            setPendingDeleteCollectionId(null);
                            onDeleteCollection(collection.id);
                          }}
                        >
                          Confirm
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </aside>
  );
}
