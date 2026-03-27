import type {
  SaveComponentResponse,
  StartCaptureMessage,
  StartPreviewMessage
} from "@/lib/library/messages";
import type { SavedComponent } from "@/lib/library/types";

export async function startCapture(): Promise<void> {
  const response = (await chrome.runtime.sendMessage({
    type: "START_CAPTURE"
  } satisfies StartCaptureMessage)) as SaveComponentResponse;

  if (!response?.ok) {
    throw new Error(response?.error || "Could not start capture.");
  }
}

export async function startPreview(component: SavedComponent): Promise<void> {
  const response = (await chrome.runtime.sendMessage({
    type: "START_PREVIEW",
    component
  } satisfies StartPreviewMessage)) as SaveComponentResponse;

  if (!response?.ok) {
    throw new Error(response?.error || "Could not start preview.");
  }
}

export function isPopupCaptureSupportedUrl(url: string | undefined): boolean {
  if (typeof url !== "string" || url.length === 0) {
    return false;
  }
  return url.startsWith("http://") || url.startsWith("https://");
}

export function getCaptureStartErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    (error.message.includes("Cannot access a chrome:// URL") ||
      error.message.includes("Capture is not available on this page"))
  ) {
    return "Capture is unavailable on this page. Open an http(s) page.";
  }
  if (error instanceof Error && error.message.includes("too large to save")) {
    return "Captured snapshot is too large to save. Select a smaller element.";
  }
  return "Failed to start capture.";
}

export function getPreviewStartErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("localhost")) {
    return "Preview is only available on localhost and 127.0.0.1.";
  }
  return "Failed to start preview.";
}
