import { describe, expect, it } from "vitest";
import type { SavedComponent } from "../../lib/library/types";
import { buildComponentPack } from "./build-component-pack";
import { validateAdaptationPatch } from "./validate-adaptation-patch";
import { applyAdaptationPatch } from "./apply-adaptation-patch";

function createComponent(): SavedComponent {
  return {
    id: "cmp-1",
    collectionIds: ["col-1"],
    url: "https://example.com",
    title: "Card",
    capturedAt: new Date().toISOString(),
    html: '<div class="card"><h2>Title</h2><button>Click</button></div>',
    cssText: ".card{padding:12px;}",
    screenshotDataUrl: "data:image/png;base64,aaa",
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

describe("adaptation modules", () => {
  it("builds a component pack with stable node ids", () => {
    const pack = buildComponentPack(createComponent());
    expect(pack.stableNodeIds.length).toBeGreaterThan(0);
    expect(pack.wrapperRootId).toBe("spectra-root");
    expect(pack.normalizedHtml).toContain("data-spectra-node-id");
  });

  it("rejects patches with unknown node ids", () => {
    const pack = buildComponentPack(createComponent());
    const validation = validateAdaptationPatch(
      {
        strategy: "css_override",
        summary: "Invalid patch",
        overrideCss: ":scope{color:red;}",
        attributeEdits: [
          {
            nodeId: "unknown-node",
            name: "class",
            value: "foo"
          }
        ],
        preservedNodeIds: [],
        confidence: 0.5,
        warnings: []
      },
      pack
    );
    expect(validation).toEqual({ ok: false, reason: "Unknown node id: unknown-node" });
  });

  it("applies safe attribute edits and appends override css", () => {
    const pack = buildComponentPack(createComponent());
    const firstNodeId = pack.stableNodeIds[0];
    const result = applyAdaptationPatch(pack, {
      strategy: "css_override",
      summary: "Applied",
      overrideCss: ":scope{color:rgb(15,23,42);}",
      attributeEdits: [
        {
          nodeId: firstNodeId,
          name: "class",
          value: "card adapted"
        }
      ],
      preservedNodeIds: [firstNodeId],
      confidence: 0.8,
      warnings: []
    });

    expect(result.html).toContain("card adapted");
    expect(result.cssText).toContain("[data-spectra-preview-content='true']{color:rgb(15,23,42);}");
  });
});
