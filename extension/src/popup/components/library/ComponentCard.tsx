import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from "@/components/ui/context-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Collection, SavedComponent } from "@/lib/library/types";
import { cn } from "@/lib/utils";
import { Check, FolderOpen, Play, Trash2 } from "lucide-react";
import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { formatCapturedAt } from "../../lib/format-timestamp";
import { FALLBACK_THUMBNAIL } from "../../types";

type ComponentCardProps = {
  component: SavedComponent;
  collections: Collection[];
  activeCollectionId: string | null;
  isDeleteConfirmOpen: boolean;
  onDeleteConfirmOpenChange: (open: boolean) => void;
  onStartPreview: (component: SavedComponent, activeCollectionId: string | null) => void;
  onOpenDetails: (componentId: string) => void;
  onCopyComponentToCollection: (componentId: string, targetCollectionId: string) => void;
  onMoveComponentToCollection: (
    componentId: string,
    sourceCollectionId: string,
    targetCollectionId: string
  ) => void;
  onDeleteComponent: (componentId: string) => void;
};

export function ComponentCard({
  component,
  collections,
  activeCollectionId,
  isDeleteConfirmOpen,
  onDeleteConfirmOpenChange,
  onStartPreview,
  onOpenDetails,
  onCopyComponentToCollection,
  onMoveComponentToCollection,
  onDeleteComponent
}: ComponentCardProps) {
  const [isMovePickerOpen, setIsMovePickerOpen] = useState(false);
  const hasMoveOptions = collections.length > 0;
  const hasMoveShortcutOptions = Boolean(activeCollectionId) && hasMoveOptions;
  const isInCollection = (collectionId: string): boolean => component.collectionIds.includes(collectionId);
  const screenshotSrc = component.screenshotDataUrl || FALLBACK_THUMBNAIL;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          className="cursor-pointer overflow-hidden rounded-md border border-border bg-(--color-card-glass) backdrop-blur-sm"
          onClick={() => {
            onOpenDetails(component.id);
          }}
        >
          <CardContent className="p-0">
            <div className="relative aspect-4/3 overflow-hidden border-b border-border/70 bg-canvas-grid">
              <div className="absolute inset-0 flex items-center justify-center p-2">
                <img
                  className="block h-auto w-auto max-h-full max-w-full rounded-sm"
                  alt={component.title || "Captured component"}
                  src={screenshotSrc}
                />
              </div>
            </div>
            <div className="grid gap-1 p-2">
              <h3 className="truncate text-xs font-semibold text-foreground">
                {component.title || "Untitled component"}
              </h3>
              <p className="truncate text-[11px] text-muted-foreground">{hostnameFromUrl(component.url)}</p>
              <p className="text-[10px] text-muted-foreground/70">{formatCapturedAt(component.capturedAt)}</p>
              <div className="mt-1 flex flex-wrap justify-end gap-1.5">
                <ComponentActionButton
                  ariaLabel="Start preview"
                  onClick={() => {
                    onStartPreview(component, activeCollectionId);
                  }}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                </ComponentActionButton>
                {hasMoveShortcutOptions ? (
                  <Popover open={isMovePickerOpen} onOpenChange={setIsMovePickerOpen}>
                    <PopoverTrigger asChild>
                      <ComponentActionButton ariaLabel="Move component">
                        <FolderOpen className="h-4 w-4" aria-hidden="true" />
                      </ComponentActionButton>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-menu-w p-1">
                      <div className="grid">
                          {collections.map((collection) => {
                            const isSourceCollection = collection.id === activeCollectionId;
                            return (
                              <button
                                key={collection.id}
                                type="button"
                                disabled={isSourceCollection}
                                className="hover:bg-surface-subtle focus:bg-surface-subtle disabled:hover:bg-transparent flex items-center justify-between rounded-sm px-2 py-1.5 text-left text-[11px] font-medium text-foreground outline-none disabled:cursor-default disabled:opacity-60"
                                onClick={() => {
                                  if (!activeCollectionId || isSourceCollection) {
                                    return;
                                  }
                                  setIsMovePickerOpen(false);
                                  onMoveComponentToCollection(component.id, activeCollectionId, collection.id);
                                }}
                              >
                                <span>{collection.name}</span>
                                {isSourceCollection ? (
                                  <Check className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                ) : null}
                              </button>
                            );
                          })}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : null}
                <Popover open={isDeleteConfirmOpen} onOpenChange={onDeleteConfirmOpenChange}>
                  <PopoverTrigger asChild>
                    <ComponentActionButton ariaLabel="Delete component">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </ComponentActionButton>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-menu-wide-w p-2">
                    <p className="mb-1.5 text-[11px] text-muted-foreground">Delete this component permanently?</p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 px-2 text-[11px]"
                        onClick={() => {
                          onDeleteConfirmOpenChange(false);
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
                          onDeleteConfirmOpenChange(false);
                          onDeleteComponent(component.id);
                        }}
                      >
                        Confirm
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-menu-w">
        <ContextMenuItem
          onSelect={() => {
            onOpenDetails(component.id);
          }}
        >
          Details
        </ContextMenuItem>
        {hasMoveOptions ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger>Copy to</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-menu-w p-1">
              <ContextMenuGroup>
                {collections.map((collection) => {
                  const alreadyInCollection = isInCollection(collection.id);
                  return (
                    <ContextMenuItem
                      key={collection.id}
                      disabled={alreadyInCollection}
                      className="justify-between"
                      onSelect={() => {
                        if (alreadyInCollection) {
                          return;
                        }
                        onCopyComponentToCollection(component.id, collection.id);
                      }}
                    >
                      <span>{collection.name}</span>
                      {alreadyInCollection ? (
                        <Check className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      ) : null}
                    </ContextMenuItem>
                  );
                })}
              </ContextMenuGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : null}
        {hasMoveOptions && activeCollectionId ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger>Move to</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-menu-w p-1">
              <ContextMenuGroup>
                {collections.map((collection) => {
                  const isSourceCollection = collection.id === activeCollectionId;
                  return (
                    <ContextMenuItem
                      key={`move-${collection.id}`}
                      disabled={isSourceCollection}
                      className="justify-between"
                      onSelect={() => {
                        if (isSourceCollection) {
                          return;
                        }
                        onMoveComponentToCollection(component.id, activeCollectionId, collection.id);
                      }}
                    >
                      <span>{collection.name}</span>
                      {isSourceCollection ? (
                        <Check className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      ) : null}
                    </ContextMenuItem>
                  );
                })}
              </ContextMenuGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : null}
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => {
            onDeleteConfirmOpenChange(true);
          }}
          variant="destructive"
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

type ComponentActionButtonProps = {
  ariaLabel: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const ComponentActionButton = forwardRef<HTMLButtonElement, ComponentActionButtonProps>(
  ({ ariaLabel, children, className, type = "button", onClick, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "flex h-5 w-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground",
          className
        )}
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ComponentActionButton.displayName = "ComponentActionButton";

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

