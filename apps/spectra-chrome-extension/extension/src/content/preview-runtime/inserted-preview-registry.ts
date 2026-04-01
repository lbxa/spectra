import type { InsertionRelation, PreviewAlignment } from "../../lib/library/messages";
import type { SavedComponent } from "../../lib/library/types";
import { watchPreviewRemoval, type PreviewMutationWatcher } from "../mutation-watch";
import { insertPreview, type InsertedPreview } from "../preview-insert";
import { createPreviewToolbar, type PreviewToolbarControls } from "../preview-toolbar";

type RegistryRemovalReason = "manual" | "mutation";

export type InsertedPreviewRecord = {
  inserted: InsertedPreview;
  toolbar: PreviewToolbarControls;
  watcher: PreviewMutationWatcher;
  host: HTMLElement;
  component: SavedComponent;
  relation: InsertionRelation;
  alignment: PreviewAlignment;
};

type InsertedPreviewRegistryDeps = {
  onActivePreviewChanged: (previewId: string | null) => void;
  onPreviewRemoved: (previewId: string, notify: boolean, reason: RegistryRemovalReason) => void;
  onRetargetRequested: (component: SavedComponent) => void;
};

export type InsertedPreviewRegistry = ReturnType<typeof createInsertedPreviewRegistry>;

export function createInsertedPreviewRegistry(deps: InsertedPreviewRegistryDeps) {
  const recordsById = new Map<string, InsertedPreviewRecord>();
  let activePreviewId: string | null = null;

  const markActive = (previewId: string | null): void => {
    activePreviewId = previewId;
    deps.onActivePreviewChanged(activePreviewId);
  };

  const getLastInsertedPreviewId = (): string | null => {
    const keys = Array.from(recordsById.keys());
    return keys.at(-1) ?? null;
  };

  const remove = (
    previewId: string,
    options?: {
      notify?: boolean;
      reason?: RegistryRemovalReason;
    }
  ): boolean => {
    const record = recordsById.get(previewId);
    if (!record) {
      return false;
    }
    const notify = options?.notify ?? true;
    const reason = options?.reason ?? "manual";
    record.watcher.stop();
    record.toolbar.unmount();
    record.inserted.wrapper.remove();
    recordsById.delete(previewId);
    if (activePreviewId === previewId) {
      markActive(getLastInsertedPreviewId());
    }
    deps.onPreviewRemoved(previewId, notify, reason);
    return true;
  };

  const register = (
    inserted: InsertedPreview,
    host: HTMLElement,
    component: SavedComponent,
    relation: InsertionRelation,
    alignment: PreviewAlignment
  ): void => {
    const toolbar = createPreviewToolbar({
      onUndo: () => {
        markActive(inserted.previewId);
        remove(inserted.previewId);
      },
      onRetarget: () => {
        markActive(inserted.previewId);
        remove(inserted.previewId);
        deps.onRetargetRequested(component);
      },
      onRelationChange: (nextRelation) => {
        markActive(inserted.previewId);
        replacePlacement(inserted.previewId, nextRelation);
      },
      onAlignmentChange: (nextAlignment) => {
        markActive(inserted.previewId);
        replacePlacement(inserted.previewId, undefined, nextAlignment);
      }
    });
    toolbar.mount(inserted.wrapper, relation, alignment);

    const watcher = watchPreviewRemoval(inserted.previewId, () => {
      remove(inserted.previewId, { notify: false, reason: "mutation" });
    });

    recordsById.set(inserted.previewId, {
      inserted,
      toolbar,
      watcher,
      host,
      component,
      relation,
      alignment
    });
    markActive(inserted.previewId);
  };

  const replacePlacement = (
    previewId: string,
    nextRelation?: InsertionRelation,
    nextAlignment?: PreviewAlignment
  ): void => {
    const record = recordsById.get(previewId);
    if (!record) {
      return;
    }
    const relation = nextRelation ?? record.relation;
    const alignment = nextAlignment ?? record.alignment;
    remove(previewId, { notify: false });
    const inserted = insertPreview(record.host, record.component, relation, alignment);
    register(inserted, record.host, record.component, relation, alignment);
  };

  const clear = (notify: boolean = true): void => {
    const previewIds = Array.from(recordsById.keys());
    for (const previewId of previewIds) {
      remove(previewId, { notify });
    }
  };

  const teardown = (): void => {
    clear(false);
  };

  return {
    register,
    remove,
    replacePlacement,
    clear,
    teardown,
    markActive,
    getActivePreviewId: (): string | null => activePreviewId,
    getLastInsertedPreviewId,
    size: (): number => recordsById.size,
    list: (): InsertedPreviewRecord[] => Array.from(recordsById.values())
  };
}
