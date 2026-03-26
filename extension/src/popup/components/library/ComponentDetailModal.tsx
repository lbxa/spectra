import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SavedComponent } from "@/lib/library/types";
import { FALLBACK_THUMBNAIL } from "../../types";

type ComponentDetailModalProps = {
  component: SavedComponent;
  onClose: () => void;
};

export function ComponentDetailModal({ component, onClose }: ComponentDetailModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-overlay p-4">
      <Card className="max-h-full w-full max-w-3xl overflow-hidden rounded-md border-border-strong">
        <CardContent className="grid max-h-[85vh] gap-2 overflow-auto p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">Component details</h3>
            <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={onClose}>
              Close
            </Button>
          </div>

          <img
            className="block h-50 w-full rounded-md border border-border bg-surface object-contain"
            alt={component.title || "Component screenshot"}
            src={component.screenshotDataUrl || FALLBACK_THUMBNAIL}
          />

          <div className="grid gap-1 text-xs">
            <p className="font-medium text-foreground">{component.title || "Untitled component"}</p>
            <p className="break-all text-muted-foreground">{component.url}</p>
            <p className="text-muted-foreground">{new Date(component.capturedAt).toLocaleString()}</p>
          </div>

          <div className="grid gap-1">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Raw HTML preview
            </p>
            <pre className="max-h-70 overflow-auto rounded-md border border-border bg-surface p-2 text-[11px] leading-snug text-muted-foreground">
              {component.html}
            </pre>
          </div>

          <div className="rounded-md border border-dashed border-border-strong bg-surface p-1.5 text-[11px] text-muted-foreground">
            Generated JSX / Tailwind output will be added in a future version.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
