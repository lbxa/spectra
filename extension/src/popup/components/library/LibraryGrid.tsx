import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Collection, SavedComponent } from "@/lib/library/types";
import { useState } from "react";
import { ComponentCard } from "./ComponentCard";
import { ComponentCanvas } from "./ComponentCanvas";

type LibraryGridProps = {
  collection: Collection | null;
  collections: Collection[];
  components: SavedComponent[];
  activeCollectionId: string | null;
  activeComponent: SavedComponent | null;
  isPreviewStarting: boolean;
  onStartPreview: (component: SavedComponent, activeCollectionId: string | null) => void;
  onOpenDetails: (componentId: string) => void;
  onCloseDetails: () => void;
  onCopyComponentToCollection: (componentId: string, targetCollectionId: string) => void;
  onMoveComponentToCollection: (
    componentId: string,
    sourceCollectionId: string,
    targetCollectionId: string
  ) => void;
  onDeleteComponent: (componentId: string) => void;
  onDeleteCollection: (collectionId: string) => void;
};

export function LibraryGrid({
  collection,
  collections,
  components,
  activeCollectionId,
  activeComponent,
  isPreviewStarting,
  onStartPreview,
  onOpenDetails,
  onCloseDetails,
  onCopyComponentToCollection,
  onMoveComponentToCollection,
  onDeleteComponent,
  onDeleteCollection
}: LibraryGridProps) {
  const [pendingDeleteComponentId, setPendingDeleteComponentId] = useState<string | null>(null);
  const [isDeleteCollectionConfirmOpen, setIsDeleteCollectionConfirmOpen] = useState(false);

  return (
    <section className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col p-2">
      <div className="mb-1.5 flex min-w-0 items-start justify-between gap-1.5">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-foreground">
            {collection ? collection.name : "Collection"}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {collection?.description || "No description"} · {components.length} component(s)
          </p>
        </div>
        {collection ? (
          <Popover open={isDeleteCollectionConfirmOpen} onOpenChange={setIsDeleteCollectionConfirmOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-transparent p-0 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit"
                disabled={collection.isSystem}
                aria-label="Delete collection"
              >
                <DeleteIcon />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-menu-wide-w p-2">
              <p className="mb-1.5 text-[11px] text-muted-foreground">
                Delete <span className="font-semibold">{collection.name}</span>? Components move to Inbox.
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 px-2 text-[11px]"
                  onClick={() => {
                    setIsDeleteCollectionConfirmOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-7 flex-1 px-2 text-[11px]"
                  onClick={() => {
                    setIsDeleteCollectionConfirmOpen(false);
                    onDeleteCollection(collection.id);
                  }}
                >
                  Confirm
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {components.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-strong bg-background p-3 text-center text-xs text-muted-foreground">
            No components in this collection yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 pb-0.5">
            {components.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                collections={collections}
                isDeleteConfirmOpen={pendingDeleteComponentId === component.id}
                onDeleteConfirmOpenChange={(open) => {
                  setPendingDeleteComponentId(open ? component.id : null);
                }}
                onStartPreview={onStartPreview}
                onOpenDetails={onOpenDetails}
                onCopyComponentToCollection={onCopyComponentToCollection}
                onMoveComponentToCollection={onMoveComponentToCollection}
                activeCollectionId={activeCollectionId}
                onDeleteComponent={onDeleteComponent}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {activeComponent ? (
        <ComponentCanvas
          component={activeComponent}
          activeCollectionId={activeCollectionId}
          isPreviewStarting={isPreviewStarting}
          onStartPreview={onStartPreview}
          onClose={onCloseDetails}
          className="absolute inset-0 z-20"
        />
      ) : null}
    </section>
  );
}

function DeleteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
