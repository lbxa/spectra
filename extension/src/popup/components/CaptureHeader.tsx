import { Button } from "@/components/ui/button";
import { Orb } from "./Orb";
import { SpaceSelect, type PopupSpace } from "./SpaceSelect";

type CaptureHeaderProps = {
  isCaptureDisabled: boolean;
  onStartCapture: () => Promise<void>;
  statusMessage: string;
  activeSpace: PopupSpace;
  onActiveSpaceChange: (space: PopupSpace) => void;
};

export function CaptureHeader({
  isCaptureDisabled,
  onStartCapture,
  statusMessage,
  activeSpace,
  onActiveSpaceChange
}: CaptureHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-1.5 border-b border-border bg-background p-2">
      <div className="flex min-w-0 items-center gap-2">
        <Orb />
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <h1 className="text-sm font-semibold tracking-tight text-muted-foreground">Spectra</h1>
            <span className="text-sm text-muted-foreground/60 pl-1">/</span>
            <SpaceSelect value={activeSpace} onValueChange={onActiveSpaceChange} />
          </div>
          {statusMessage ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {statusMessage}
            </p>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="h-9 w-9 rounded-md px-0 shadow-none"
        title="Capture component (hold Shift to target parent)"
        disabled={isCaptureDisabled}
        onClick={() => {
          void onStartCapture();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M14 4.1 12 6" />
          <path d="m5.1 8-2.9-.8" />
          <path d="m6 12-1.9 2" />
          <path d="M7.2 2.2 8 5.1" />
          <path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" />
        </svg>
      </Button>
    </header>
  );
}
