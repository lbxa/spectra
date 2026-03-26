import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CaptureHeader } from "./components/CaptureHeader";
import { ComponentList } from "./components/ComponentList";
import { getCaptureStartErrorMessage, isPopupCaptureSupportedUrl, startCapture } from "./lib/messages";
import { getSavedComponents } from "./lib/storage";
import type { PopupSavedComponent } from "./types";

export function App() {
  const [records, setRecords] = useState<PopupSavedComponent[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isCaptureAvailable, setIsCaptureAvailable] = useState(true);
  const [isCaptureStarting, setIsCaptureStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadRecords = async (): Promise<void> => {
      const saved = await getSavedComponents();
      if (cancelled) {
        return;
      }

      setRecords(saved);
      if (saved.length > 0) {
        setStatusMessage(`${saved.length} saved component(s).`);
      }
    };

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeCaptureAvailability = async (): Promise<void> => {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        const supported = isPopupCaptureSupportedUrl(activeTab?.url);
        if (cancelled) {
          return;
        }

        setIsCaptureAvailable(supported);
        if (!supported) {
          setStatusMessage("Capture is unavailable on this page. Open an http(s) page.");
        }
      } catch (error) {
        console.error("Failed to check active tab before capture:", error);
      }
    };

    void initializeCaptureAvailability();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCaptureStart = async (): Promise<void> => {
    setIsCaptureStarting(true);
    setStatusMessage("Starting capture...");

    try {
      await startCapture();
      setStatusMessage("Capture mode enabled on the active tab.");
      window.close();
    } catch (error) {
      console.error("Failed to start capture:", error);
      setStatusMessage(getCaptureStartErrorMessage(error));
      setIsCaptureStarting(false);
    }
  };

  const handleCopyComplete = (message: string): void => {
    setStatusMessage(message);
  };

  return (
    <main className="flex min-h-[420px] flex-col bg-gradient-to-b from-slate-100 via-slate-50 to-white p-3">
      <CaptureHeader
        isCaptureDisabled={!isCaptureAvailable || isCaptureStarting}
        onStartCapture={handleCaptureStart}
      />

      <div className="mt-2 mb-2 min-h-6">
        {statusMessage ? (
          <Badge
            variant="outline"
            className="rounded-md border-slate-300 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700"
          >
            {statusMessage}
          </Badge>
        ) : null}
      </div>

      <Separator className="mb-3 bg-slate-200" />

      <ComponentList records={records} onCopyComplete={handleCopyComplete} />
    </main>
  );
}
