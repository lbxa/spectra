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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-6">
      <Card className="max-h-full w-full max-w-3xl overflow-hidden border-slate-300">
        <CardContent className="grid max-h-[85vh] gap-3 overflow-auto p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="truncate text-sm font-semibold text-slate-900">Component details</h3>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>

          <img
            className="block h-[220px] w-full rounded-md border border-slate-200 bg-slate-100 object-contain"
            alt={component.title || "Component screenshot"}
            src={component.screenshotDataUrl || FALLBACK_THUMBNAIL}
          />

          <div className="grid gap-1 text-xs">
            <p className="font-medium text-slate-900">{component.title || "Untitled component"}</p>
            <p className="break-all text-slate-700">{component.url}</p>
            <p className="text-slate-500">{new Date(component.capturedAt).toLocaleString()}</p>
          </div>

          <div className="grid gap-1">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">Raw HTML preview</p>
            <pre className="max-h-[280px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
              {component.html}
            </pre>
          </div>

          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-2 text-[11px] text-slate-600">
            Generated JSX / Tailwind output will be added in a future version.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
