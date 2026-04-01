import { describe, expect, it } from "vitest";
import type { InsertedPreviewRecord } from "../preview-runtime/inserted-preview-registry";
import type { SavedComponent } from "../../lib/library/types";
import { buildComponentPack } from "./build-component-pack";

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
  content.innerHTML = "<button role=\"button\">Click</button><div>Body</div>";
  wrapper.appendChild(content);

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

describe("buildComponentPack", () => {
  it("assigns stable node ids and protected ids", () => {
    const record = createRecord();
    const pack = buildComponentPack(record);

    expect(pack.wrapperRootId).toContain("spectra-adapt-root");
    expect(pack.stableNodeIds.length).toBeGreaterThan(0);
    expect(pack.protectedNodeIds.length).toBeGreaterThan(0);
    expect(pack.protectedNodeIds[0]).toContain("preview_1-node-");
  });
});
