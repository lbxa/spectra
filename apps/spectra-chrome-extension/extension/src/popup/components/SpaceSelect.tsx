import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export type PopupSpace = "library" | "previews";

type SpaceSelectProps = {
  value: PopupSpace;
  onValueChange: (value: PopupSpace) => void;
};

export function SpaceSelect({ value, onValueChange }: SpaceSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        onValueChange(next as PopupSpace);
      }}
    >
      <SelectTrigger className="h-6 w-auto rounded-md border border-border/70 bg-background/70 px-1 py-0 text-sm font-semibold tracking-tight text-foreground shadow-none ring-0 transition-colors duration-200 hover:bg-surface-subtle focus-visible:border-border-strong focus-visible:bg-surface-subtle focus-visible:ring-0 data-[state=open]:border-border-strong data-[state=open]:bg-surface-subtle [&>svg]:hidden cursor-pointer">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="library">Library</SelectItem>
        <SelectItem value="previews">Previews</SelectItem>
      </SelectContent>
    </Select>
  );
}
