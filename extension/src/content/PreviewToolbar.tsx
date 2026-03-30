import type { InsertionRelation, PreviewAlignment } from "../lib/library/messages";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { AlignCenterVertical, AlignEndVertical, AlignStartVertical, Check, ChevronDown, Crosshair, MoveHorizontal, Undo2 } from "lucide-react";

type PreviewToolbarProps = {
  relation: InsertionRelation;
  alignment: PreviewAlignment;
  onUndo: () => void;
  onRetarget: () => void;
  onRelationChange: (relation: InsertionRelation) => void;
  onAlignmentChange: (alignment: PreviewAlignment) => void;
};

const RELATION_OPTIONS: Array<{ value: InsertionRelation; label: string }> = [
  { value: "inside", label: "Inside" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" }
];

const ALIGNMENT_OPTIONS: Array<{
  value: PreviewAlignment;
  label: "Left" | "Center" | "Right";
  Icon: typeof AlignStartVertical;
}> = [
  { value: "start", label: "Left", Icon: AlignStartVertical },
  { value: "center", label: "Center", Icon: AlignCenterVertical },
  { value: "end", label: "Right", Icon: AlignEndVertical }
];

export function PreviewToolbar({
  relation,
  alignment,
  onUndo,
  onRetarget,
  onRelationChange,
  onAlignmentChange
}: PreviewToolbarProps) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(148,163,184,0.28)] bg-[rgba(17,24,39,0.95)] p-1.5 font-sans text-[11px] leading-none text-slate-50 shadow-[0_10px_22px_rgba(0,0,0,0.25)]">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Undo"
        title="Undo"
        className="h-6 w-7 cursor-pointer rounded-md border-[rgba(148,163,184,0.4)] bg-[rgba(15,23,42,1)] p-0 text-slate-50 transition-colors hover:bg-[rgba(30,41,59,1)] hover:text-slate-50 focus-visible:ring-2 focus-visible:ring-[rgba(148,163,184,0.5)]"
        onClick={onUndo}
      >
        <Undo2 size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Retarget"
        title="Retarget"
        className="h-6 w-7 cursor-pointer rounded-md border-[rgba(148,163,184,0.4)] bg-[rgba(15,23,42,1)] p-0 text-slate-50 transition-colors hover:bg-[rgba(30,41,59,1)] hover:text-slate-50 focus-visible:ring-2 focus-visible:ring-[rgba(148,163,184,0.5)]"
        onClick={onRetarget}
      >
        <Crosshair size={12} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Insert position"
            title="Insert position"
            className="h-6 w-9 cursor-pointer gap-0.5 rounded-md border-[rgba(148,163,184,0.4)] bg-[rgba(15,23,42,1)] px-1.5 text-[11px] font-medium text-slate-50 transition-colors hover:bg-[rgba(30,41,59,1)] hover:text-slate-50 focus-visible:ring-2 focus-visible:ring-[rgba(148,163,184,0.5)]"
          >
            <MoveHorizontal size={13} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            <ChevronDown size={13} strokeWidth={2} aria-hidden="true" className="shrink-0 opacity-80" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-12 rounded-md border-[rgba(148,163,184,0.4)] bg-[rgba(15,23,42,0.98)] text-slate-50 shadow-[0_14px_30px_rgba(0,0,0,0.35)]"
          style={{ zIndex: 2147483648 }}
        >
          <DropdownMenuGroup>
            {RELATION_OPTIONS.map((option) => {
              const isActive = option.value === relation;
              return (
                <DropdownMenuItem
                  key={option.value}
                  className="cursor-pointer py-0.5 whitespace-nowrap text-slate-50 focus:bg-[rgba(30,41,59,1)] focus:text-slate-50"
                  onSelect={() => {
                    onRelationChange(option.value);
                  }}
                >
                  <span>{option.label}</span>
                  <Check
                    size={12}
                    strokeWidth={2}
                    aria-hidden="true"
                    className={`ml-auto shrink-0 ${isActive ? "opacity-100" : "opacity-0"}`}
                  />
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="inline-flex h-6 overflow-hidden rounded-md border border-[rgba(148,163,184,0.4)] bg-[rgba(15,23,42,1)]">
        {ALIGNMENT_OPTIONS.map((option, index) => {
          const OptionIcon = option.Icon;
          const isActive = option.value === alignment;
          return (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              aria-label={`${option.label} align`}
              title={option.label}
              className={`h-6 w-7 cursor-pointer rounded-none border-0 p-0 text-slate-50 transition-colors hover:bg-[rgba(30,41,59,1)] hover:text-slate-50 focus-visible:ring-2 focus-visible:ring-[rgba(148,163,184,0.5)] ${
                index > 0 ? "border-l border-[rgba(148,163,184,0.35)]" : ""
              } ${isActive ? "bg-[rgba(30,41,59,1)]" : "bg-transparent"}`}
              onClick={() => {
                onAlignmentChange(option.value);
              }}
            >
              <OptionIcon size={13} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}
