import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { SavedComponent } from "@/lib/library/types";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { FALLBACK_THUMBNAIL } from "../../types";

type ComponentDetailModalProps = {
  component: SavedComponent;
  onClose: () => void;
};

export function ComponentDetailModal({ component, onClose }: ComponentDetailModalProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const exportSnippet = component.html;
  const isCopied = copyStatus === "copied";

  useEffect(() => {
    if (!isCopied) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setCopyStatus("idle");
    }, 1200);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isCopied]);

  const handleCopyRaw = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(exportSnippet);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("idle");
    }
  };

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
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Export</p>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 rounded-r-none px-2 text-[11px] transition-all duration-300 ease-out cursor-pointer",
                    isCopied &&
                      "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.35)] hover:border-emerald-500 hover:bg-emerald-500 hover:text-white"
                  )}
                  onClick={() => {
                    void handleCopyRaw();
                  }}
                >
                  <span className="relative inline-flex min-w-8 items-center justify-center">
                    <span
                      className={cn(
                        "transition-all duration-250 ease-out",
                        isCopied ? "translate-y-1 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
                      )}
                    >
                      Copy
                    </span>
                    <Check
                      aria-hidden="true"
                      className={cn(
                        "absolute h-3.5 w-3.5 transition-all duration-250 ease-out",
                        isCopied ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-75 opacity-0"
                      )}
                    />
                  </span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 rounded-l-none border-l-0 p-0"
                      aria-label="Open copy options"
                    >
                      <ChevronDownIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel>More copy options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Open in ChatGPT</DropdownMenuItem>
                    <DropdownMenuItem>Open in Claude</DropdownMenuItem>
                    <DropdownMenuItem>Open in Gemini</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <pre className="max-h-70 overflow-auto rounded-md border border-border bg-surface p-2 text-[11px] leading-snug text-muted-foreground">
              {exportSnippet}
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

function ChevronDownIcon() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
