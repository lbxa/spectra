import type { SavedComponent } from "../lib/library/types";
import { describe, expect, it, vi } from "vitest";
import { markScopedCss } from "./capture-snapshot";
import { insertPreview, removeAllPreviews, removePreviewById } from "./preview-insert";

function createComponent(cssText: string): SavedComponent {
  return {
    id: "cmp-1",
    collectionIds: ["col-1"],
    url: "https://example.com",
    title: "Component",
    capturedAt: new Date().toISOString(),
    html: `<div class="card">Card</div>`,
    cssText,
    screenshotDataUrl: "data:image/png;base64,abc",
    sourceHostSignature: {
      landmark: "unknown",
      hostTag: "div",
      layoutMode: "unknown",
      widthBucket: "md",
      depth: 0,
      siblingCount: 0,
      ancestorTags: []
    }
  };
}

describe("preview insert css compatibility", () => {
  it("uses stored scoped css directly for marker-tagged captures", () => {
    vi.spyOn(Date, "now").mockReturnValue(123);
    const host = document.createElement("div");
    document.body.appendChild(host);

    const storedScopedCss = `[data-spectra-capture-root="cap-1"] .card { color: red; }`;
    insertPreview(host, createComponent(markScopedCss(storedScopedCss)), "inside", "start");

    const style = host.querySelector("style");
    expect(style?.textContent).toContain(storedScopedCss);
    expect(style?.textContent).not.toContain('[data-spectra-preview-id="preview_123"] .card');

    removeAllPreviews();
    host.remove();
    vi.restoreAllMocks();
  });

  it("re-scopes :scope rules to preview content only", () => {
    vi.spyOn(Date, "now").mockReturnValue(123);
    const host = document.createElement("div");
    document.body.appendChild(host);

    const cssWithScope = `:scope button { color: rgb(59,130,246); }`;
    insertPreview(host, createComponent(markScopedCss(cssWithScope)), "inside", "start");

    const style = host.querySelector("style");
    expect(style?.textContent).toContain(
      `[data-spectra-preview-id="preview_123"] [data-spectra-preview-content="true"] button`
    );
    expect(style?.textContent).not.toContain(":scope button");

    removeAllPreviews();
    host.remove();
    vi.restoreAllMocks();
  });

  it("keeps runtime scoping behavior for legacy css captures", () => {
    vi.spyOn(Date, "now").mockReturnValue(123);
    const host = document.createElement("div");
    document.body.appendChild(host);

    insertPreview(host, createComponent(`.card { color: blue; }`), "inside", "start");

    const style = host.querySelector("style");
    expect(style?.textContent).toContain('[data-spectra-preview-id="preview_123"] .card');

    removeAllPreviews();
    host.remove();
    vi.restoreAllMocks();
  });

  it("keeps multiple previews inserted at the same time", () => {
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(123)
      .mockReturnValueOnce(456);

    const hostA = document.createElement("div");
    const hostB = document.createElement("div");
    document.body.append(hostA, hostB);

    insertPreview(hostA, createComponent(`.card { color: red; }`), "inside", "start");
    insertPreview(hostB, createComponent(`.card { color: blue; }`), "inside", "start");

    expect(document.querySelectorAll("[data-spectra-preview-id]")).toHaveLength(2);
    expect(document.querySelector('[data-spectra-preview-id="preview_123"]')).not.toBeNull();
    expect(document.querySelector('[data-spectra-preview-id="preview_456"]')).not.toBeNull();

    removeAllPreviews();
    hostA.remove();
    hostB.remove();
    vi.restoreAllMocks();
  });

  it("removes only the targeted preview id", () => {
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(123)
      .mockReturnValueOnce(456);

    const hostA = document.createElement("div");
    const hostB = document.createElement("div");
    document.body.append(hostA, hostB);

    insertPreview(hostA, createComponent(`.card { color: red; }`), "inside", "start");
    insertPreview(hostB, createComponent(`.card { color: blue; }`), "inside", "start");

    removePreviewById("preview_123");
    expect(document.querySelector('[data-spectra-preview-id="preview_123"]')).toBeNull();
    expect(document.querySelector('[data-spectra-preview-id="preview_456"]')).not.toBeNull();

    removeAllPreviews();
    hostA.remove();
    hostB.remove();
    vi.restoreAllMocks();
  });
});
