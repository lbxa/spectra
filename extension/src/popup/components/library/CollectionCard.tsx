import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/library/types";
import { useEffect, useRef } from "react";

type CollectionCardProps = {
  collection: Collection;
  isSelected: boolean;
  count: number;
  draft: { name: string; description: string };
  onSelect: () => void;
  onRequestRename: () => void;
  onDelete: () => void;
  shouldFocusNameInput: boolean;
  onNameFocusHandled: () => void;
  onChangeName: (name: string) => void;
  onChangeDescription: (description: string) => void;
  onFocusDraft: () => void;
  onBlurDraft: () => void;
};

export function CollectionCard({
  collection,
  isSelected,
  count,
  draft,
  onSelect,
  onRequestRename,
  onDelete,
  shouldFocusNameInput,
  onNameFocusHandled,
  onChangeName,
  onChangeDescription,
  onFocusDraft,
  onBlurDraft
}: CollectionCardProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!shouldFocusNameInput || !isSelected) {
      return;
    }
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
    onNameFocusHandled();
  }, [isSelected, onNameFocusHandled, shouldFocusNameInput]);

  return (
    <li className="group w-full cursor-pointer">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) {
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }}
            className={cn(
              "flex w-full items-start justify-between gap-1.5 rounded-md border p-1 text-left transition-colors",
              isSelected
                ? "border-primary bg-primary text-background"
                : "border-border bg-background text-foreground hover:bg-surface"
            )}
          >
            <span className="grid min-w-0 flex-1 gap-1">
              <input
                ref={nameInputRef}
                value={draft.name}
                onClick={(event) => {
                  if (isSelected) {
                    event.stopPropagation();
                  }
                }}
                onChange={(event) => {
                  if (isSelected) {
                    onChangeName(event.target.value);
                  }
                }}
                onFocus={() => {
                  if (isSelected) {
                    onFocusDraft();
                  }
                }}
                onBlur={() => {
                  if (isSelected) {
                    onBlurDraft();
                  }
                }}
                readOnly={!isSelected}
                tabIndex={isSelected ? 0 : -1}
                className={cn(
                  "h-6 rounded-md border border-transparent px-1.5 text-[12px] font-medium outline-none transition-colors focus-visible:border-secondary",
                  isSelected ? "hover:cursor-text hover:border-accent-1" : "pointer-events-none",
                  isSelected ? "text-background placeholder:text-accent-2" : "text-foreground"
                )}
              />
              <input
                value={draft.description}
                onClick={(event) => {
                  if (isSelected) {
                    event.stopPropagation();
                  }
                }}
                onChange={(event) => {
                  if (isSelected) {
                    onChangeDescription(event.target.value);
                  }
                }}
                onFocus={() => {
                  if (isSelected) {
                    onFocusDraft();
                  }
                }}
                onBlur={() => {
                  if (isSelected) {
                    onBlurDraft();
                  }
                }}
                readOnly={!isSelected}
                tabIndex={isSelected ? 0 : -1}
                className={cn(
                  "h-6 rounded-md border border-transparent px-1.5 text-[10px] outline-none transition-colors focus-visible:border-secondary",
                  isSelected ? "hover:cursor-text hover:border-accent-1" : "pointer-events-none",
                  isSelected ? "text-accent-2 placeholder:text-accent-2" : "text-muted-foreground"
                )}
                placeholder="No description"
              />
            </span>
            <div className="mr-0.5 mt-0.5 flex shrink-0 items-center gap-0.5 self-start">
              <Badge
                className={cn(
                  "shrink-0 rounded-md border-transparent px-1 py-0 text-[10px]",
                  isSelected ? "bg-secondary text-background" : "bg-surface-subtle text-muted-foreground"
                )}
              >
                {count}
              </Badge>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-menu-w">
          <ContextMenuItem onSelect={onSelect}>Select</ContextMenuItem>
          <ContextMenuItem onSelect={onRequestRename}>Rename</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={onDelete}
            disabled={collection.isSystem}
            variant="destructive"
            className="data-disabled:text-muted-foreground"
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </li>
  );
}
