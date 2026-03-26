import { ScrollArea } from "@/components/ui/scroll-area";
import type { PopupSavedComponent } from "../types";
import { ComponentCard } from "./ComponentCard";

type ComponentListProps = {
  records: PopupSavedComponent[];
  onCopyComplete: (message: string) => void;
};

export function ComponentList({ records, onCopyComplete }: ComponentListProps) {
  if (records.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-4 text-[12px] text-slate-600">
        No captures yet. Start capture on a page to save your first component.
      </section>
    );
  }

  return (
    <ScrollArea className="h-[332px] pr-1">
      <section className="grid gap-3 pb-1" aria-label="Saved components">
        {records.map((record) => (
          <ComponentCard key={record.id} record={record} onCopyComplete={onCopyComplete} />
        ))}
      </section>
    </ScrollArea>
  );
}
