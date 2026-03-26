import { Button } from "@/components/ui/button";

type CaptureHeaderProps = {
  isCaptureDisabled: boolean;
  onStartCapture: () => Promise<void>;
};

export function CaptureHeader({ isCaptureDisabled, onStartCapture }: CaptureHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/85 p-2 shadow-sm backdrop-blur-sm">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900">Spectra</h1>
        <p className="text-[11px] text-slate-500">Capture and review reusable UI snippets</p>
      </div>
      <Button
        type="button"
        size="sm"
        className="rounded-md bg-slate-900 text-white shadow-sm hover:bg-slate-800"
        disabled={isCaptureDisabled}
        onClick={() => {
          void onStartCapture();
        }}
      >
        Capture
      </Button>
    </header>
  );
}
