import { describe, expect, it } from "vitest";
import { getCaptureFailureMessage } from "./capture-runtime-bridge";

describe("getCaptureFailureMessage", () => {
  it("maps runtime availability failures to a recovery message", () => {
    const message = getCaptureFailureMessage(new Error("Extension runtime unavailable"));
    expect(message).toBe("Extension runtime unavailable. Reload the extension, then refresh this tab");
  });

  it("maps oversized snapshot failures to an actionable message", () => {
    const message = getCaptureFailureMessage(new Error("Snapshot too large to save"));
    expect(message).toBe("Snapshot too large. Select a smaller element");
  });

  it("falls back to a generic capture failure message", () => {
    const message = getCaptureFailureMessage(new Error("Unexpected"));
    expect(message).toBe("Capture failed");
  });
});
