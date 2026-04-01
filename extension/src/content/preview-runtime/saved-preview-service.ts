import type {
  ApplySavedPreviewMessage,
  ApplySavedPreviewResponse,
  InsertionRelation,
  ListSavedPreviewsForPageMessage,
  ListSavedPreviewsForPageResponse,
  PreviewAlignment,
  SavePreviewSceneMessage,
  SavePreviewSceneResponse
} from "../../lib/library/messages";
import type {
  SavedComponent,
  SavedPreview,
  SavedPreviewApplyResult,
  SavedPreviewListItem
} from "../../lib/library/types";
import type { InsertedPreviewRecord } from "./inserted-preview-registry";
import { createRuntimeDiagnostic } from "./diagnostics";
import type { PreviewRuntimeDiagnostic } from "./surface-model";
import { buildAnchorSpec, buildNormalizedLayout, buildPreviewTarget, resolveAnchor } from "./helpers";

type SavedPreviewServiceDeps = {
  runWithBusyState: <T>(task: () => Promise<T>) => Promise<T>;
  requestRuntime: <TResponse>(message: unknown) => Promise<TResponse>;
  getInsertedPreviews: () => InsertedPreviewRecord[];
  onInsertResolvedPreview: (
    host: HTMLElement,
    component: SavedComponent,
    relation: InsertionRelation,
    alignment: PreviewAlignment
  ) => void;
  setSavedPreviews: (previews: SavedPreviewListItem[]) => void;
  showToast: (message: string) => void;
  playOptimisticSaveJingle: () => void;
  showSuccessFlash: () => void;
  onDiagnostics?: (diagnostics: PreviewRuntimeDiagnostic[]) => void;
};

export function createSavedPreviewService(deps: SavedPreviewServiceDeps) {
  const loadSavedPreviewsForCurrentPage = async (): Promise<void> => {
    const target = buildPreviewTarget();
    const response = await deps.runWithBusyState(() =>
      deps.requestRuntime<ListSavedPreviewsForPageResponse>({
        type: "LIST_SAVED_PREVIEWS_FOR_PAGE",
        payload: {
          origin: target.origin,
          pathname: target.pathname
        }
      } satisfies ListSavedPreviewsForPageMessage)
    );
    deps.setSavedPreviews(response?.ok ? response.previews : []);
    if (!response || !response.ok) {
      deps.showToast(response?.error || "Could not load saved previews");
    }
  };

  const saveCurrentPreviewScene = async (): Promise<void> => {
    const insertedPreviews = deps.getInsertedPreviews();
    if (insertedPreviews.length === 0) {
      deps.showToast("Place at least one component first");
      return;
    }

    const now = new Date().toISOString();
    const referenceViewport = {
      width: Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1),
      height: Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1)
    };
    const scene: SavedPreview = {
      id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `saved_preview_${Date.now()}`,
      name: `Preview ${new Date().toLocaleString()}`,
      status: "active",
      target: buildPreviewTarget(),
      instances: insertedPreviews.map((insertedState, index) => ({
        id: insertedState.inserted.previewId,
        componentId: insertedState.component.id,
        componentVersion: 1,
        placement: {
          anchor: buildAnchorSpec(insertedState.host),
          insertionMode: insertedState.relation,
          alignment: insertedState.alignment,
          order: index + 1
        },
        render: {
          visible: true
        },
        layout: buildNormalizedLayout(insertedState.inserted.content, referenceViewport)
      })),
      createdAt: now,
      updatedAt: now,
      revision: 1,
      schemaVersion: 1
    };

    const response = await deps.runWithBusyState(() => {
      deps.playOptimisticSaveJingle();
      return deps.requestRuntime<SavePreviewSceneResponse>({
        type: "SAVE_PREVIEW_SCENE",
        payload: scene
      } satisfies SavePreviewSceneMessage);
    });

    if (!response || !response.ok) {
      deps.showToast(response?.error || "Could not save preview");
      return;
    }

    deps.showSuccessFlash();
    deps.showToast("Preview saved");
    await loadSavedPreviewsForCurrentPage();
  };

  const applySavedPreviewById = async (previewId: string): Promise<void> => {
    const response = await deps.runWithBusyState(() =>
      deps.requestRuntime<ApplySavedPreviewResponse>({
        type: "APPLY_SAVED_PREVIEW",
        payload: {
          previewId
        }
      } satisfies ApplySavedPreviewMessage)
    );
    if (!response || !response.ok || !response.preview) {
      deps.showToast(response?.error || "Could not apply saved preview");
      return;
    }

    const componentById = new Map(
      (response.components ?? []).map((component) => [component.id, component] as const)
    );
    const results = applySavedPreviewScene(response.preview, componentById);
    deps.onDiagnostics?.(collectApplyDiagnostics(results));
    const appliedCount = results.filter(
      (result) => result.status === "applied" || result.status === "applied_with_fallback"
    ).length;
    const total = results.length;
    if (appliedCount === total) {
      deps.showToast(`Applied ${appliedCount} component(s)`);
      return;
    }
    deps.showToast(`Applied ${appliedCount}/${total} component(s)`);
  };

  const applySavedPreviewScene = (
    preview: SavedPreview,
    componentById: Map<string, SavedComponent>
  ): SavedPreviewApplyResult[] => {
    const orderedInstances = [...preview.instances].sort((left, right) => {
      if (left.placement.order !== right.placement.order) {
        return left.placement.order - right.placement.order;
      }
      return left.id.localeCompare(right.id);
    });
    const results: SavedPreviewApplyResult[] = [];
    const readyToInsert: Array<{
      instance: SavedPreview["instances"][number];
      component: SavedComponent;
      resolution: {
        element: HTMLElement;
        selector?: string;
        usedFallback: boolean;
      };
    }> = [];

    for (const instance of orderedInstances) {
      const component = componentById.get(instance.componentId);
      if (!component) {
        results.push({
          instanceId: instance.id,
          status: "component_missing",
          reason: "Component not found in library"
        });
        continue;
      }
      const resolution = resolveAnchor(instance.placement.anchor);
      if (!resolution.element) {
        results.push({
          instanceId: instance.id,
          status: "anchor_not_found",
          reason: "Anchor not found"
        });
        continue;
      }
      if (!isStableAnchor(resolution.element)) {
        results.push({
          instanceId: instance.id,
          status: "anchor_not_found",
          reason: "Anchor unstable"
        });
        continue;
      }
      readyToInsert.push({
        instance,
        component,
        resolution: {
          element: resolution.element,
          selector: resolution.selector,
          usedFallback: resolution.usedFallback
        }
      });
    }

    for (const pending of readyToInsert) {
      deps.onInsertResolvedPreview(
        pending.resolution.element,
        pending.component,
        pending.instance.placement.insertionMode,
        pending.instance.placement.alignment
      );
      results.push({
        instanceId: pending.instance.id,
        status: pending.resolution.usedFallback ? "applied_with_fallback" : "applied",
        resolvedSelector: pending.resolution.selector
      });
    }
    return results;
  };

  return {
    saveCurrentPreviewScene,
    loadSavedPreviewsForCurrentPage,
    applySavedPreviewById
  };
}

function isStableAnchor(element: HTMLElement): boolean {
  if (!element.isConnected) {
    return false;
  }
  const tagName = element.tagName.toLowerCase();
  return tagName !== "html" && tagName !== "body";
}

function collectApplyDiagnostics(results: SavedPreviewApplyResult[]): PreviewRuntimeDiagnostic[] {
  const diagnostics: PreviewRuntimeDiagnostic[] = [];
  const hasPartialApply = results.some((result) => result.status !== "applied");
  if (hasPartialApply) {
    diagnostics.push(
      createRuntimeDiagnostic({
        code: "partial_apply",
        message: "Saved preview applied with degraded confidence",
        severity: "warning"
      })
    );
  }
  for (const result of results) {
    if (result.status === "applied_with_fallback") {
      diagnostics.push(
        createRuntimeDiagnostic({
          code: "fallback_anchor_used",
          message: `Applied fallback anchor for instance ${result.instanceId}`,
          severity: "info"
        })
      );
      continue;
    }
    if (result.status === "anchor_not_found") {
      diagnostics.push(
        createRuntimeDiagnostic({
          code: result.reason === "Anchor unstable" ? "anchor_unstable" : "anchor_not_found",
          message: result.reason ?? `Anchor not found for instance ${result.instanceId}`,
          severity: "warning"
        })
      );
      continue;
    }
    if (result.status === "component_missing") {
      diagnostics.push(
        createRuntimeDiagnostic({
          code: "component_missing",
          message: result.reason ?? `Component missing for instance ${result.instanceId}`,
          severity: "error"
        })
      );
    }
  }
  return diagnostics;
}
