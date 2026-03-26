import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PopupSavedComponent } from "../types";
import { FALLBACK_THUMBNAIL } from "../types";

type ComponentCardProps = {
  record: PopupSavedComponent;
  onCopyComplete: (message: string) => void;
};

export function ComponentCard({ record, onCopyComplete }: ComponentCardProps) {
  const handleCopyHtml = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(record.html);
      onCopyComplete("HTML copied.");
    } catch (error) {
      console.error("Failed to copy HTML:", error);
      onCopyComplete("Copy failed.");
    }
  };

  const handleCopyHtmlCss = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(record.html);
      onCopyComplete("HTML + CSS copied.");
    } catch (error) {
      console.error("Failed to copy HTML + CSS:", error);
      onCopyComplete("Copy failed.");
    }
  };

  return (
    <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-100/80 p-2">
          <figure className="m-0 min-w-0">
            <figcaption className="mb-1 text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
              Screenshot
            </figcaption>
            <img
              className="block h-[120px] w-full rounded-md border border-slate-300 bg-white object-cover"
              alt="Captured component thumbnail"
              src={record.screenshotDataUrl || FALLBACK_THUMBNAIL}
            />
          </figure>

          <figure className="m-0 min-w-0">
            <figcaption className="mb-1 text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
              Replay
            </figcaption>
            <iframe
              className="block h-[120px] w-full rounded-md border border-slate-300 bg-white"
              loading="lazy"
              sandbox="allow-same-origin"
              srcDoc={record.html}
              title="Captured component isolated replay"
            />
          </figure>
        </div>

        <div className="grid gap-2 p-3">
          <h2 className="m-0 text-[13px] font-semibold leading-tight text-slate-900">
            {record.title.trim() ? record.title : "Untitled page"}
          </h2>

          <p className="m-0 truncate text-[11px] text-slate-600">{record.url}</p>

          <p className="m-0 text-[11px] text-slate-500">{formatTimestamp(record.capturedAt)}</p>

          <div className="mt-1 flex flex-wrap justify-end gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-md border-slate-300 bg-white px-2.5 text-[11px] text-slate-800 hover:bg-slate-100"
              onClick={() => {
                void handleCopyHtml();
              }}
            >
              Copy HTML
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-md border-slate-300 bg-white px-2.5 text-[11px] text-slate-800 hover:bg-slate-100"
              onClick={() => {
                void handleCopyHtmlCss();
              }}
            >
              Copy HTML + CSS
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Captured time unavailable";
  }
  return `Captured ${date.toLocaleString()}`;
}
