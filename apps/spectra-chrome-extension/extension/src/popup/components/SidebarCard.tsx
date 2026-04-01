import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SidebarCardProps = {
  isSelected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
};

export function SidebarCard({ isSelected, onClick, children, className }: SidebarCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex w-full items-start justify-between gap-1.5 rounded-md border p-1 text-left transition-colors",
        isSelected
          ? "border-primary bg-primary text-background"
          : "border-border bg-background text-foreground hover:bg-surface",
        className
      )}
    >
      {children}
    </div>
  );
}
