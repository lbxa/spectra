import { Button } from "@/components/ui/button";

type CaptureHeaderProps = {
  isCaptureDisabled: boolean;
  onStartCapture: () => Promise<void>;
};

export function CaptureHeader({ isCaptureDisabled, onStartCapture }: CaptureHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900">Spectra Library</h1>
        <p className="text-[11px] text-slate-500">Capture components into Inbox, then organize collections</p>
      </div>
      <Button
        type="button"
        className="size-12 rounded-xl bg-slate-900 p-2 text-white shadow-sm hover:bg-slate-800"
        disabled={isCaptureDisabled}
        onClick={() => {
          void onStartCapture();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-mouse-pointer-click-icon lucide-mouse-pointer-click"
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
