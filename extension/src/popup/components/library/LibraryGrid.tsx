import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Collection, SavedComponent } from "@/lib/library/types";
import { useState } from "react";
import { FALLBACK_THUMBNAIL } from "../../types";

type LibraryGridProps = {
  collection: Collection | null;
  components: SavedComponent[];
  onOpenDetails: (componentId: string) => void;
  onMoveComponent: (componentId: string) => void;
  onDeleteComponent: (componentId: string) => void;
};

export function LibraryGrid({
  collection,
  components,
  onOpenDetails,
  onMoveComponent,
  onDeleteComponent
}: LibraryGridProps) {
  const [pendingDeleteComponentId, setPendingDeleteComponentId] = useState<string | null>(null);

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col p-4">
      <div className="mb-3 min-w-0">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-900">
            {collection ? collection.name : "Collection"}
          </h2>
          <p className="truncate text-xs text-slate-600">
            {collection?.description || "No description"} · {components.length} component(s)
          </p>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 pr-2">
        {components.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-600">
            No components in this collection yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-2">
            {components.map((component) => (
              <Card key={component.id} className="overflow-hidden border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  <img
                    className="block h-[140px] w-full border-b border-slate-200 bg-slate-100 object-cover"
                    alt={component.title || "Captured component"}
                    src={component.screenshotDataUrl || FALLBACK_THUMBNAIL}
                  />
                  <div className="grid gap-2 p-3">
                    <h3 className="truncate text-xs font-semibold text-slate-900">
                      {component.title || "Untitled component"}
                    </h3>
                    <p className="truncate text-[11px] text-slate-600">{hostnameFromUrl(component.url)}</p>
                    <p className="text-[10px] text-slate-500">{formatTimestamp(component.capturedAt)}</p>
                    <div className="mt-1 flex flex-wrap justify-end gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-md p-0 text-slate-700"
                        aria-label="Open details"
                        onClick={() => {
                          onOpenDetails(component.id);
                        }}
                      >
                        <DetailsIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-md p-0 text-slate-700"
                        aria-label="Move component"
                        onClick={() => {
                          onMoveComponent(component.id);
                        }}
                      >
                        <MoveIcon />
                      </Button>
                      <Popover
                        open={pendingDeleteComponentId === component.id}
                        onOpenChange={(open) => {
                          setPendingDeleteComponentId(open ? component.id : null);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 rounded-md p-0 text-red-600 hover:text-red-700"
                            aria-label="Delete component"
                          >
                            <DeleteIcon />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-56">
                          <p className="mb-2 text-[11px] text-slate-700">
                            Delete this component permanently?
                          </p>
                          <div className="flex gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setPendingDeleteComponentId(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="flex-1 !border-red-600 !bg-red-600 !text-white hover:!bg-red-700 hover:!text-white"
                              onClick={() => {
                                setPendingDeleteComponentId(null);
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
            ))}
          </div>
        )}
      </ScrollArea>
    </section>
  );
}

function MoveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
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
      width="24"
      height="24"
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
      width="24"
      height="24"
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
