import { describe, expect, it } from "vitest";
import type { AdaptationPatch, ComponentPack } from "../../lib/adaptation/types";
import { validateAdaptationPatch } from "./validate-adaptation-patch";

function createComponentPack(overrides: Partial<ComponentPack> = {}): ComponentPack {
  return {
    wrapperRootId: "spectra-adapt-root-preview_1",
    semanticRoleHint: "button",
    normalizedHtml: "<button data-spectra-node-id='n1'>A</button>",
    baseCss: "#spectra-adapt-root-preview_1 button { color: inherit; }",
    stableNodeIds: ["preview_1-node-1", "preview_1-node-2"],
    protectedNodeIds: ["preview_1-node-2"],
    ...overrides
  };
}

function createPatch(overrides: Partial<AdaptationPatch> = {}): AdaptationPatch {
  return {
    strategy: "css_override",
    summary: "Adapted styles",
    overrideCss: "#spectra-adapt-root-preview_1 { color: rgb(15, 23, 42); }",
    attributeEdits: [],
    preservedNodeIds: ["preview_1-node-2"],
    confidence: 0.81,
    warnings: [],
    ...overrides
  };
}

describe("validateAdaptationPatch", () => {
  it("accepts a safe scoped patch", () => {
    const result = validateAdaptationPatch(createPatch(), createComponentPack());
    expect(result).toEqual({ ok: true });
  });

  it("rejects non-scoped css selectors", () => {
    const result = validateAdaptationPatch(
      createPatch({
        overrideCss: "button { color: red; }"
      }),
      createComponentPack()
    );
    expect(result).toMatchObject({
      ok: false
    });
  });

  it("rejects edits against unknown node ids", () => {
    const result = validateAdaptationPatch(
      createPatch({
        attributeEdits: [
          {
            nodeId: "missing",
            name: "class",
            value: "x"
          }
        ]
      }),
      createComponentPack()
    );
    expect(result).toMatchObject({
      ok: false
    });
  });

  it("rejects missing protected node preservation", () => {
    const result = validateAdaptationPatch(
      createPatch({
        preservedNodeIds: []
      }),
      createComponentPack()
    );
    expect(result).toMatchObject({
      ok: false
    });
  });
});
