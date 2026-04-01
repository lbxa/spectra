import { describe, expect, it, vi } from "vitest";
import type {
  SavedComponent,
  SavedPreview,
  SavedPreviewListItem
} from "../../lib/library/types";
import { createSavedPreviewService } from "./saved-preview-service";

function createComponent(id: string): SavedComponent {
  return {
    id,
    collectionIds: ["col-1"],
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

function createPreview(placement: SavedPreview["instances"][number]["placement"]): SavedPreview {
  const now = new Date().toISOString();
  return {
    id: "pv-1",
    name: "Saved Preview",
    status: "active",
    target: {
      origin: "https://example.com",
      pathname: "/",
      matchMode: "exact_path",
      canonicalUrl: "https://example.com/"
    },
    instances: [
      {
        id: "instance-1",
        componentId: "cmp-1",
        componentVersion: 1,
        placement,
        render: { visible: true }
      }
    ],
    createdAt: now,
    updatedAt: now,
    revision: 1,
    schemaVersion: 1
  };
}

function createServiceHarness(overrides?: {
  requestRuntime?: <TResponse>(message: unknown) => Promise<TResponse>;
}) {
  const diagnostics: Array<{ code: string; message: string; severity: string }> = [];
  const inserted: Array<{ host: HTMLElement; componentId: string }> = [];
  const toasts: string[] = [];
  let savedPreviews: SavedPreviewListItem[] = [];

  const service = createSavedPreviewService({
    runWithBusyState: async <T>(task: () => Promise<T>): Promise<T> => task(),
    requestRuntime:
      overrides?.requestRuntime ??
      (async () => {
        throw new Error("requestRuntime not mocked");
      }),
    getInsertedPreviews: () => [],
    onInsertResolvedPreview: (host, component) => {
      inserted.push({ host, componentId: component.id });
    },
    setSavedPreviews: (previews) => {
      savedPreviews = previews;
    },
    showToast: (message) => {
      toasts.push(message);
    },
    playOptimisticSaveJingle: () => undefined,
    showSuccessFlash: () => undefined,
    onDiagnostics: (nextDiagnostics) => {
      diagnostics.push(...nextDiagnostics);
    }
  });

  return {
    service,
    diagnostics,
    inserted,
    toasts,
    getSavedPreviews: () => savedPreviews
  };
}

describe("saved-preview-service diagnostics and confidence gates", () => {
  it("records fallback diagnostics when applying with fallback anchor", async () => {
    const host = document.createElement("section");
    host.id = "host-fallback";
    document.body.appendChild(host);

    const component = createComponent("cmp-1");
    const preview = createPreview({
      anchor: {
        strategy: "selector",
        primarySelector: "#missing-anchor",
        fallbackSelectors: ["#host-fallback"]
      },
      insertionMode: "inside",
      alignment: "start",
      order: 1
    });

    const harness = createServiceHarness({
      requestRuntime: async <TResponse>(_message: unknown) =>
        ({
          ok: true,
          preview,
          components: [component]
        }) as TResponse
    });

    await harness.service.applySavedPreviewById("pv-1");

    expect(harness.inserted).toHaveLength(1);
    expect(harness.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["fallback_anchor_used", "partial_apply"])
    );
    expect(harness.toasts.at(-1)).toBe("Applied 1 component(s)");
  });

  it("degrades when anchor is unstable and avoids insertion", async () => {
    const component = createComponent("cmp-1");
    const preview = createPreview({
      anchor: {
        strategy: "selector",
        primarySelector: "body",
        fallbackSelectors: []
      },
      insertionMode: "inside",
      alignment: "start",
      order: 1
    });

    const harness = createServiceHarness({
      requestRuntime: async <TResponse>(_message: unknown) =>
        ({
          ok: true,
          preview,
          components: [component]
        }) as TResponse
    });

    await harness.service.applySavedPreviewById("pv-1");

    expect(harness.inserted).toHaveLength(0);
    expect(harness.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["anchor_unstable", "partial_apply"])
    );
    expect(harness.toasts.at(-1)).toBe("Applied 0/1 component(s)");
  });
});
