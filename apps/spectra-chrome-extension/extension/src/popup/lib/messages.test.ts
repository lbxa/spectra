import type { SavedComponent } from "@/lib/library/types";
import { describe, expect, it, vi } from "vitest";
import {
  applySavedPreviewOnActiveTab,
  getPreviewStartErrorMessage,
  listSavedPreviewsForPage,
  startCapture,
  startPreview
} from "./messages";

function createComponent(id: string, collectionId: string): SavedComponent {
  return {
    id,
    collectionIds: [collectionId],
    url: "https://example.com",
    title: id,
    capturedAt: new Date().toISOString(),
    html: "<div></div>",
    cssText: "",
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

describe("getPreviewStartErrorMessage", () => {
  it("maps unsupported page errors to guidance copy", () => {
    expect(
      getPreviewStartErrorMessage(
        new Error("Preview is unavailable on this page. Open an http(s) page and try again.")
      )
    ).toBe("Preview is unavailable on this page. Open an http(s) page");

    expect(getPreviewStartErrorMessage(new Error("Cannot access a chrome:// URL"))).toBe(
      "Preview is unavailable on this page. Open an http(s) page"
    );

    expect(
      getPreviewStartErrorMessage(
        new Error("Cannot access contents of url \"https://example.com\". Extension manifest must request permission.")
      )
    ).toBe("Preview is unavailable on this page. Open an http(s) page");
  });

  it("keeps generic fallback for unknown errors", () => {
    expect(getPreviewStartErrorMessage(new Error("network issue"))).toBe("Failed to start preview");
    expect(getPreviewStartErrorMessage("plain error")).toBe("Failed to start preview");
  });
});

describe("startPreview", () => {
  it("sends activeCollectionId in START_PREVIEW payload", async () => {
    const component = createComponent("cmp-1", "col-1");
    await startPreview(component, "col-2");

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "START_PREVIEW",
      activeCollectionId: "col-2",
      component
    });
  });

  it("throws when runtime response is not ok", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(
      ({
        ok: false,
        error: "boom"
      } as unknown) as void
    );

    await expect(startPreview(createComponent("cmp-1", "col-1"), "col-1")).rejects.toThrow("boom");
  });
});

describe("startCapture", () => {
  it("sends activeCollectionId in START_CAPTURE payload", async () => {
    await startCapture("col-7");

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "START_CAPTURE",
      activeCollectionId: "col-7"
    });
  });
});

describe("listSavedPreviewsForPage", () => {
  it("sends list command and returns previews", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(
      ({
        ok: true,
        previews: []
      } as unknown) as void
    );

    await expect(listSavedPreviewsForPage("https://example.com", "/products")).resolves.toMatchObject({
      ok: true,
      previews: []
    });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "LIST_SAVED_PREVIEWS_FOR_PAGE",
      payload: {
        origin: "https://example.com",
        pathname: "/products"
      }
    });
  });
});

describe("applySavedPreviewOnActiveTab", () => {
  it("sends apply command for active tab", async () => {
    await applySavedPreviewOnActiveTab("pv-1");
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "APPLY_SAVED_PREVIEW_ON_TAB",
      payload: {
        previewId: "pv-1"
      }
    });
  });
});
