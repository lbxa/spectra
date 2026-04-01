import { ScrollArea } from "@/components/ui/scroll-area";
import type { SavedPreviewListItem } from "@/lib/library/types";
import { SidebarCard } from "../SidebarCard";

type PreviewsSidebarProps = {
  previews: SavedPreviewListItem[];
  selectedPreviewId: string | null;
  onSelectPreview: (previewId: string) => void;
};

export function PreviewsSidebar({ previews, selectedPreviewId, onSelectPreview }: PreviewsSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 w-rail-w min-w-rail-w flex-col border-r border-border bg-surface/80 p-2">
      <div className="mb-1.5 min-w-0">
        <h2 className="truncate text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Previews</h2>
        <p className="truncate text-[11px] text-muted-foreground">{previews.length} saved preview(s)</p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="grid w-full gap-1">
          {previews.map((preview) => {
            const parsed = safeParseUrl(preview.target.canonicalUrl);
            const isSelected = preview.id === selectedPreviewId;
            return (
              <li key={preview.id} className="group w-full cursor-pointer">
                <SidebarCard
                  isSelected={isSelected}
                  onClick={() => {
                    onSelectPreview(preview.id);
                  }}
                >
                  <span className="grid min-w-0 flex-1 gap-0.5 px-1.5 py-0.5">
                    <span className="truncate text-[12px] font-medium">{preview.name}</span>
                    <span className="truncate text-[10px] opacity-85">{parsed.hostname}</span>
                    <span className="truncate text-[10px] opacity-70">{parsed.pathname}</span>
                  </span>
                </SidebarCard>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </aside>
  );
}

function safeParseUrl(url: string): { hostname: string; pathname: string } {
  try {
    const parsed = new URL(url);
    return {
      hostname: parsed.hostname || url,
      pathname: parsed.pathname || "/"
    };
  } catch {
    return { hostname: url, pathname: "/" };
  }
}
