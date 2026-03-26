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
import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { FALLBACK_THUMBNAIL } from "../../types";

type ComponentCardProps = {
  component: SavedComponent;
  collections: Collection[];
  isDeleteConfirmOpen: boolean;
  onDeleteConfirmOpenChange: (open: boolean) => void;
  onOpenDetails: (componentId: string) => void;
  onMoveComponentToCollection: (componentId: string, targetCollectionId: string) => void;
  onDeleteComponent: (componentId: string) => void;
};

export function ComponentCard({
  component,
  collections,
  isDeleteConfirmOpen,
  onDeleteConfirmOpenChange,
  onOpenDetails,
  onMoveComponentToCollection,
  onDeleteComponent
}: ComponentCardProps) {
  const [isMovePickerOpen, setIsMovePickerOpen] = useState(false);
  const destinationCollections = collections.filter((collection) => collection.id !== component.collectionId);
  const hasMoveOptions = destinationCollections.length > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card className="overflow-hidden rounded-md shadow-none">
          <CardContent className="p-0">
            <img
              className="block h-33 w-full border-b border-border bg-surface object-cover"
              alt={component.title || "Captured component"}
              src={component.screenshotDataUrl || FALLBACK_THUMBNAIL}
            />
            <div className="grid gap-1.5 p-2">
              <h3 className="truncate text-xs font-semibold text-foreground">
                {component.title || "Untitled component"}
              </h3>
              <p className="truncate text-[11px] text-muted-foreground">{hostnameFromUrl(component.url)}</p>
              <p className="text-[10px] text-muted-foreground">{formatTimestamp(component.capturedAt)}</p>
              <div className="mt-0.5 flex flex-wrap justify-end gap-1.5">
                <ComponentActionButton
                  ariaLabel="Open details"
                  onClick={() => {
                    onOpenDetails(component.id);
                  }}
                >
                  <DetailsIcon />
                </ComponentActionButton>
                {hasMoveOptions ? (
                  <Popover open={isMovePickerOpen} onOpenChange={setIsMovePickerOpen}>
                    <PopoverTrigger asChild>
                      <ComponentActionButton ariaLabel="Move component">
                        <MoveIcon />
                      </ComponentActionButton>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-44 p-1">
                      <div className="grid">
                        {destinationCollections.map((collection) => (
                          <button
                            key={collection.id}
                            type="button"
                            className="hover:bg-surface-subtle focus:bg-surface-subtle rounded-sm px-2 py-1.5 text-left text-[11px] font-medium text-foreground outline-none"
                            onClick={() => {
                              setIsMovePickerOpen(false);
                              onMoveComponentToCollection(component.id, collection.id);
                            }}
                          >
                            {collection.name}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : null}
                <Popover open={isDeleteConfirmOpen} onOpenChange={onDeleteConfirmOpenChange}>
                  <PopoverTrigger asChild>
                    <ComponentActionButton ariaLabel="Delete component">
                      <DeleteIcon />
                    </ComponentActionButton>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-52 p-2">
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
      <ContextMenuContent className="w-44">
        <ContextMenuItem
          onSelect={() => {
            onOpenDetails(component.id);
          }}
        >
          Details
        </ContextMenuItem>
        {hasMoveOptions ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger>Move to</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-44 p-1">
              <ContextMenuGroup>
                {destinationCollections.map((collection) => (
                  <ContextMenuItem
                    key={collection.id}
                    onSelect={() => {
                      onMoveComponentToCollection(component.id, collection.id);
                    }}
                  >
                    {collection.name}
                  </ContextMenuItem>
                ))}
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
  ({ ariaLabel, children, className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "flex h-5 w-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground",
          className
        )}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ComponentActionButton.displayName = "ComponentActionButton";

function MoveIcon() {
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
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

function DetailsIcon() {
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
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M17 12h.01" />
      <path d="M12 12h.01" />
      <path d="M7 12h.01" />
    </svg>
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
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Captured time unavailable";
  }
  return date.toLocaleString();
}
