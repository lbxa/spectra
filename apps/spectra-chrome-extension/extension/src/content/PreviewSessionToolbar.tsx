import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { SavedPreviewListItem } from "../lib/library/types";
import { ChevronDown, Eye, LogOut, Save, Trash2 } from "lucide-react";

type PreviewSessionToolbarProps = {
  previews: SavedPreviewListItem[];
  isBusy: boolean;
  onSave: () => void;
  onLoadPreviews: () => void;
  onApplyPreview: (previewId: string) => void;
  onClearAll: () => void;
  onExit: () => void;
};

const WRAPPER_CLASS =
  "inline-flex items-center gap-1.5 rounded-xl border border-[rgba(148,163,184,0.28)] bg-[rgba(17,24,39,0.95)] p-1.5 font-sans text-[11px] leading-none text-slate-50 shadow-[0_10px_22px_rgba(0,0,0,0.25)]";

const BUTTON_CLASS =
  "h-6 cursor-pointer rounded-md border-[rgba(148,163,184,0.4)] bg-[rgba(15,23,42,1)] px-2 text-[11px] font-medium text-slate-50 transition-colors hover:bg-[rgba(30,41,59,1)] hover:text-slate-50 focus-visible:ring-2 focus-visible:ring-[rgba(148,163,184,0.5)]";

export function PreviewSessionToolbar({
  previews,
  isBusy,
  onSave,
  onLoadPreviews,
  onApplyPreview,
  onClearAll,
  onExit
}: PreviewSessionToolbarProps) {
  return (
    <div className={WRAPPER_CLASS}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={BUTTON_CLASS}
        disabled={isBusy}
        onClick={onSave}
      >
        <Save size={12} strokeWidth={2} aria-hidden="true" className="mr-1 shrink-0" />
        Save preview
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={BUTTON_CLASS}
            disabled={isBusy}
            onClick={onLoadPreviews}
          >
            <Eye size={12} strokeWidth={2} aria-hidden="true" className="mr-1 shrink-0" />
            View saved
            <ChevronDown size={12} strokeWidth={2} aria-hidden="true" className="ml-1 shrink-0 opacity-80" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="min-w-48 rounded-md border-[rgba(148,163,184,0.4)] bg-[rgba(15,23,42,0.98)] text-slate-50 shadow-[0_14px_30px_rgba(0,0,0,0.35)]"
          style={{ zIndex: 2147483648 }}
        >
          <DropdownMenuGroup>
            {previews.length > 0 ? (
              previews.map((preview) => (
                <DropdownMenuItem
                  key={preview.id}
                  className="cursor-pointer py-1 whitespace-nowrap text-slate-50 focus:bg-[rgba(30,41,59,1)] focus:text-slate-50"
                  onSelect={() => {
                    onApplyPreview(preview.id);
                  }}
                >
                  <span className="truncate">{preview.name}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem
                disabled
                className="cursor-default py-1 whitespace-nowrap text-slate-300 focus:bg-transparent focus:text-slate-300"
              >
                No previews for this page
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={BUTTON_CLASS}
        disabled={isBusy}
        onClick={onClearAll}
      >
        <Trash2 size={12} strokeWidth={2} aria-hidden="true" className="mr-1 shrink-0" />
        Clear all
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={BUTTON_CLASS}
        disabled={isBusy}
        onClick={onExit}
      >
        <LogOut size={12} strokeWidth={2} aria-hidden="true" className="mr-1 shrink-0" />
        Exit
      </Button>
    </div>
  );
}
