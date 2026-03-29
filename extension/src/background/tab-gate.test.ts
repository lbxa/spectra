import { describe, expect, it } from "vitest";
import { assertPreviewEligibleUrl, isPreviewEligibleUrl } from "./tab-gate";

describe("preview URL gate", () => {
  it("accepts localhost and non-localhost http(s) urls", () => {
    expect(isPreviewEligibleUrl("http://localhost:3000")).toBe(true);
    expect(isPreviewEligibleUrl("https://127.0.0.1:5173")).toBe(true);
    expect(isPreviewEligibleUrl("https://example.com/page")).toBe(true);
  });

  it("rejects unsupported schemes and invalid values", () => {
    expect(isPreviewEligibleUrl("chrome://extensions")).toBe(false);
    expect(isPreviewEligibleUrl("file:///tmp/example.html")).toBe(false);
    expect(isPreviewEligibleUrl(undefined)).toBe(false);
    expect(isPreviewEligibleUrl("")).toBe(false);
  });

  it("throws actionable unsupported-page error", () => {
    expect(() => assertPreviewEligibleUrl("chrome://extensions")).toThrow(
      "Preview is unavailable on this page. Open an http(s) page and try again."
    );
  });
});
