import { describe, expect, it } from "vitest";
import { mapInstancesToPreviewNodes } from "./geometry-mapper";
import type { SavedComponent, SavedPreviewInstance } from "@/lib/library/types";

function buildInstance(
  id: string,
  input: Partial<SavedPreviewInstance["placement"]> & {
    layout?: SavedPreviewInstance["layout"];
  } = {}
): SavedPreviewInstance {
  return {
    id,
    componentId: `cmp-${id}`,
    componentVersion: 1,
    placement: {
      anchor: {
        strategy: "selector",
        primarySelector: "main",
        fallbackSelectors: []
      },
      insertionMode: input.insertionMode ?? "inside",
      alignment: input.alignment ?? "center",
      order: input.order ?? 1
    },
    render: {
      visible: true
    },
    layout: input.layout
  };
}

function buildComponent(id: string): SavedComponent {
  return {
    id: `cmp-${id}`,
    collectionIds: ["col-1"],
    url: "https://example.com",
    title: `Component ${id}`,
    capturedAt: new Date().toISOString(),
    html: "<div />",
    cssText: "",
    screenshotDataUrl: `data:image/png;base64,component-${id}`,
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

describe("mapInstancesToPreviewNodes", () => {
  it("sorts instances by order and creates deterministic rows", () => {
    const componentsById = new Map([["cmp-a", buildComponent("a")], ["cmp-b", buildComponent("b")], ["cmp-c", buildComponent("c")]]);
    const nodes = mapInstancesToPreviewNodes([
      buildInstance("b", { order: 2 }),
      buildInstance("a", { order: 1 }),
      buildInstance("c", { order: 3 })
    ], componentsById);

    expect(nodes.map((node) => node.id)).toEqual(["a", "b", "c"]);
    expect(nodes[0]?.position.y).toBeLessThan(nodes[1]?.position.y ?? 0);
    expect(nodes[1]?.position.y).toBeLessThan(nodes[2]?.position.y ?? 0);
  });

  it("maps persisted normalized geometry to proportional positions and size", () => {
    const componentsById = new Map([
      ["cmp-left-before", buildComponent("left-before")],
      ["cmp-center-inside", buildComponent("center-inside")],
      ["cmp-right-after", buildComponent("right-after")]
    ]);
    const nodes = mapInstancesToPreviewNodes([
      buildInstance("left-before", {
        insertionMode: "before",
        alignment: "start",
        order: 1,
        layout: {
          referenceViewport: { width: 1000, height: 800 },
          normalizedRect: { x: 0.1, y: 0.2, width: 0.25, height: 0.2 }
        }
      }),
      buildInstance("center-inside", {
        insertionMode: "inside",
        alignment: "center",
        order: 2,
        layout: {
          referenceViewport: { width: 1000, height: 800 },
          normalizedRect: { x: 0.4, y: 0.5, width: 0.3, height: 0.25 }
        }
      }),
      buildInstance("right-after", {
        insertionMode: "after",
        alignment: "end",
        order: 3,
        layout: {
          referenceViewport: { width: 1000, height: 800 },
          normalizedRect: { x: 0.75, y: 0.1, width: 0.15, height: 0.3 }
        }
      })
    ], componentsById);

    expect(nodes[0]?.position.x).toBe(100);
    expect(nodes[1]?.position.x).toBe(400);
    expect(nodes[2]?.position.x).toBe(750);
    expect(nodes[0]?.data.width).toBe(240);
    expect(nodes[0]?.data.height).toBe(160);
    expect(nodes[1]?.data.height).toBe(200);
  });

  it("falls back to insertion/alignment buckets when normalized layout is missing", () => {
    const nodes = mapInstancesToPreviewNodes([
      buildInstance("left-before", { insertionMode: "before", alignment: "start", order: 1 }),
      buildInstance("center-inside", { insertionMode: "inside", alignment: "center", order: 2 }),
      buildInstance("right-after", { insertionMode: "after", alignment: "end", order: 3 })
    ], new Map([
      ["cmp-left-before", buildComponent("left-before")],
      ["cmp-center-inside", buildComponent("center-inside")],
      ["cmp-right-after", buildComponent("right-after")]
    ]));

    expect(nodes[0]?.position.x).toBe(92);
    expect(nodes[1]?.position.x).toBe(420);
    expect(nodes[2]?.position.x).toBe(748);
  });

  it("marks all preview nodes as read-only", () => {
    const nodes = mapInstancesToPreviewNodes([buildInstance("only")], new Map([["cmp-only", buildComponent("only")]]));

    expect(nodes[0]).toMatchObject({
      draggable: false,
      selectable: false,
      type: "preview-instance"
    });
  });

  it("propagates screenshot data onto node payloads", () => {
    const screenshotDataUrl = "data:image/png;base64,preview-screenshot";
    const nodes = mapInstancesToPreviewNodes([buildInstance("with-shot")], new Map([
      [
        "cmp-with-shot",
        {
          ...buildComponent("with-shot"),
          screenshotDataUrl
        }
      ]
    ]));

    expect(nodes[0]?.data.screenshotDataUrl).toBe(screenshotDataUrl);
  });
});
