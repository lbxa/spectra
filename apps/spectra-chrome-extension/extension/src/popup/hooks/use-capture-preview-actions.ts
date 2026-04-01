import { useEffect, useState } from "react";
import type { Collection, SavedComponent } from "@/lib/library/types";
import {
  getCaptureStartErrorMessage,
  getPreviewStartErrorMessage,
  isPopupCaptureSupportedUrl,
  startCapture,
  startPreview
} from "../lib/messages";

export function useCapturePreviewActions(input: {
  collections: Collection[];
  selectedCollectionId: string | null;
  libraryStateSelectedCollectionId: string | null;
  setStatusMessage: (message: string) => void;
}): {
  isCaptureAvailable: boolean;
  isCaptureStarting: boolean;
  isPreviewStarting: boolean;
  handleCaptureStart: () => Promise<void>;
  handlePreviewStart: (component: SavedComponent, activeCollectionIdFromUi: string | null) => Promise<void>;
} {
  const [isCaptureAvailable, setIsCaptureAvailable] = useState(true);
  const [isCaptureStarting, setIsCaptureStarting] = useState(false);
  const [isPreviewStarting, setIsPreviewStarting] = useState(false);

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
          input.setStatusMessage("Capture is unavailable on this page. Open an http(s) page");
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
    const activeCollectionId = resolveActiveCollectionId({
      collections: input.collections,
      selectedCollectionId: input.selectedCollectionId,
      libraryStateSelectedCollectionId: input.libraryStateSelectedCollectionId
    });
    if (!activeCollectionId) {
      input.setStatusMessage("Select a collection before starting capture");
      return;
    }

    setIsCaptureStarting(true);
    input.setStatusMessage("Starting capture");
    try {
      await startCapture(activeCollectionId);
      input.setStatusMessage("Capture mode enabled on the active tab");
      window.close();
    } catch (error) {
      console.error("Failed to start capture:", error);
      input.setStatusMessage(getCaptureStartErrorMessage(error));
      setIsCaptureStarting(false);
    }
  };

  const handlePreviewStart = async (
    component: SavedComponent,
    activeCollectionIdFromUi: string | null
  ): Promise<void> => {
    const activeCollectionId = resolveActiveCollectionId({
      collections: input.collections,
      selectedCollectionId: input.selectedCollectionId,
      libraryStateSelectedCollectionId: input.libraryStateSelectedCollectionId,
      activeCollectionIdFromUi
    });
    if (!activeCollectionId) {
      input.setStatusMessage("Select a collection before starting preview");
      return;
    }

    setIsPreviewStarting(true);
    input.setStatusMessage("Starting preview");
    try {
      await startPreview(component, activeCollectionId);
      input.setStatusMessage("Preview mode enabled on the active tab");
      window.close();
    } catch (error) {
      console.error("Failed to start preview:", error);
      input.setStatusMessage(getPreviewStartErrorMessage(error));
      setIsPreviewStarting(false);
    }
  };

  return {
    isCaptureAvailable,
    isCaptureStarting,
    isPreviewStarting,
    handleCaptureStart,
    handlePreviewStart
  };
}

function resolveActiveCollectionId(input: {
  collections: Collection[];
  selectedCollectionId: string | null;
  libraryStateSelectedCollectionId: string | null;
  activeCollectionIdFromUi?: string | null;
}): string | null {
  const existingIds = new Set(input.collections.map((collection) => collection.id));
  const candidates = [
    input.activeCollectionIdFromUi,
    input.selectedCollectionId,
    input.libraryStateSelectedCollectionId
  ];
  for (const candidate of candidates) {
    if (candidate && existingIds.has(candidate)) {
      return candidate;
    }
  }
  return null;
}
