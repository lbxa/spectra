export function getCaptureFailureMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("runtime unavailable")) {
    return "Extension runtime unavailable. Reload the extension, then refresh this tab";
  }
  if (error instanceof Error && error.message.includes("too large to save")) {
    return "Snapshot too large. Select a smaller element";
  }
  return "Capture failed";
}
