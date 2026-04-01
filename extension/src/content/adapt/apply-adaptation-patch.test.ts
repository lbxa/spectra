import { describe, expect, it } from "vitest";
import type { AdaptationPatch } from "../../lib/adaptation/types";
import type { InsertedPreviewRecord } from "../preview-runtime/inserted-preview-registry";
import type { SavedComponent } from "../../lib/library/types";
import { applyAdaptationPatch } from "./apply-adaptation-patch";

function createComponent(): SavedComponent {
  return {
    id: "cmp-1",
    collectionIds: ["col-1"],
    url: "https://example.com",
    title: "Component",
    capturedAt: "2026-04-01T12:00:00.000Z",
    html: "<button>Click</button>",
    cssText: "#old { color: red; }",
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

function createRecord(): InsertedPreviewRecord {
  const wrapper = document.createElement("div");
  const content = document.createElement("div");
  content.innerHTML = "<button data-spectra-node-id=\"n1\" class=\"a\">Click</button>";
  wrapper.appendChild(content);
  const baseStyle = document.createElement("style");
  baseStyle.textContent = "#spectra { color: red; }";
  wrapper.prepend(baseStyle);

  return {
    inserted: {
      previewId: "preview_1",
      wrapper,
      content
    },
    toolbar: {
      mount: () => {},
      update: () => {},
      unmount: () => {}
    },
    watcher: {
      stop: () => {}
    },
    host: document.createElement("section"),
    component: createComponent(),
    relation: "inside",
    alignment: "start",
    magicState: "idle"
  };
}

describe("applyAdaptationPatch", () => {
  it("applies attribute edits and adaptation css", () => {
    const record = createRecord();
    const patch: AdaptationPatch = {
      strategy: "css_override",
      summary: "updated",
      overrideCss: "#spectra-adapt-root-preview_1 button { color: blue; }",
      attributeEdits: [
        {
          nodeId: "n1",
          name: "class",
          value: "b"
        }
      ],
      preservedNodeIds: ["n1"],
      confidence: 0.8,
      warnings: []
    };

    const result = applyAdaptationPatch({
      record,
      patch
    });

    const button = record.inserted.content.querySelector("button");
    expect(button?.getAttribute("class")).toBe("b");
    expect(result.adaptedHtml).toContain("class=\"b\"");
    expect(result.adaptedCssText).toContain("color: blue");
  });
});
