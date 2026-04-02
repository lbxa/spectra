import { describe, expect, it } from "vitest";
import { applyAdaptationPatch } from "./apply-adaptation-patch";
import type { ComponentPack } from "../../lib/library/messages";

describe("applyAdaptationPatch", () => {
  it("applies attribute edits and appends override css", () => {
    const pack: ComponentPack = {
      normalizedHtml: `<button data-spectra-node-id="node-1">Buy</button>`,
      baseCss: ":scope button{color:black;}",
      stableNodeIds: ["node-1"],
      semanticRoleHint: "button",
      protectedNodeIds: ["node-1"],
      wrapperRootId: "root"
    };
    const result = applyAdaptationPatch(pack, {
      strategy: "css_override",
      summary: "adapt",
      overrideCss: ":scope button{color:white;background:black;}",
      attributeEdits: [
        {
          nodeId: "node-1",
          name: "class",
          value: "adapted"
        }
      ],
      preservedNodeIds: ["node-1"],
      confidence: 0.9,
      warnings: []
    });

    expect(result.html).toContain(`class="adapted"`);
    expect(result.cssText).toContain(":scope button{color:black;}");
    expect(result.cssText).toContain("[data-spectra-preview-content='true'] button{color:white;background:black;}");
  });
});
