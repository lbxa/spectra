import type { BeginTargetingMessage, InsertionRelation, PreviewAlignment } from "../lib/library/messages";
import type { SavedComponent } from "../lib/library/types";
import { rankCandidates } from "./candidate-rank";
import { scanCandidateContainers, type CandidateContainer } from "./candidate-scan";
import { updateGhostPlacement } from "./ghost-placement";
import { watchPreviewRemoval, type PreviewMutationWatcher } from "./mutation-watch";
import { mountOverlayRoot, type OverlayRoot } from "./overlay-root";
import { insertPreview, type InsertedPreview } from "./preview-insert";
import { createPreviewToolbar, type PreviewToolbarControls } from "./preview-toolbar";

type PreviewState = "idle" | "targeting" | "inserted";

type RuntimeWindow = Window & {
  __spectraPreviewRuntimeV1__?: {
    teardown: () => void;
  };
};

type PreviewSession = {
  state: PreviewState;
  relation: InsertionRelation;
  alignment: PreviewAlignment;
  component: SavedComponent | null;
  overlay: OverlayRoot | null;
  candidates: CandidateContainer[];
  activeCandidate: CandidateContainer | null;
  insertedById: Map<string, InsertedPreviewState>;
  activePreviewId: string | null;
};

type InsertedPreviewState = {
  inserted: InsertedPreview;
  toolbar: PreviewToolbarControls;
  watcher: PreviewMutationWatcher;
  host: HTMLElement;
  component: SavedComponent;
  relation: InsertionRelation;
  alignment: PreviewAlignment;
};

(() => {
  const runtimeWindow = window as RuntimeWindow;
  if (runtimeWindow.__spectraPreviewRuntimeV1__) {
    return;
  }

  const session: PreviewSession = {
    state: "idle",
    relation: "inside",
    alignment: "start",
    component: null,
    overlay: null,
    candidates: [],
    activeCandidate: null,
    insertedById: new Map(),
    activePreviewId: null
  };

  const onRuntimeMessage = (message: unknown): void => {
    if (!message || typeof message !== "object" || !("type" in message)) {
      return;
    }
    if (message.type === "BEGIN_TARGETING") {
      void beginTargeting(message as BeginTargetingMessage);
    }
  };

  const onPointerMove = (event: MouseEvent): void => {
    if (session.state !== "targeting" || !session.overlay) {
      return;
    }
    const candidate = pickCandidateAt(event.clientX, event.clientY, session.candidates);
    if (!candidate) {
      return;
    }
    session.activeCandidate = candidate;
    updateCandidatePresentation(candidate, session.overlay, session.relation);
  };

  const onClick = (event: MouseEvent): void => {
    if (session.state !== "targeting" || !session.overlay || !session.component) {
      return;
    }
    const candidate = session.activeCandidate;
    if (!candidate) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    commitInsert(candidate, session.component).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to insert preview";
      session.overlay?.showToast(message);
      void sendStatus({ type: "PREVIEW_ERROR", code: "insert_failed", message });
      resetToIdle();
    });
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && session.state === "targeting") {
      resetToIdle();
      return;
    }
    if (event.key === "Delete" && session.insertedById.size > 0) {
      const previewId = session.activePreviewId ?? getLastInsertedPreviewId();
      if (previewId) {
        removeInsertedPreviewById(previewId);
      }
    }
  };

  function ensureOverlay(): OverlayRoot {
    if (session.overlay) {
      return session.overlay;
    }
    session.overlay = mountOverlayRoot();
    document.addEventListener("mousemove", onPointerMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    return session.overlay;
  }

  async function beginTargeting(message: BeginTargetingMessage): Promise<void> {
    const overlay = ensureOverlay();
    session.component = message.component;
    session.state = "targeting";
    session.relation = "inside";
    session.alignment = "start";

    const candidates = scanCandidateContainers();
    if (candidates.length === 0) {
      overlay.showToast("No valid target containers found");
      await sendStatus({
        type: "PREVIEW_ERROR",
        code: "no_candidates",
        message: "No valid target containers found"
      });
      resetToIdle();
      return;
    }

    const ranked = rankCandidates(candidates, message.component);
    session.candidates = ranked;
    session.activeCandidate = ranked[0] ?? null;
    if (!session.activeCandidate) {
      resetToIdle();
      return;
    }

    updateCandidatePresentation(session.activeCandidate, overlay, session.relation);
    await sendStatus({ type: "PREVIEW_READY" });
  }

  async function commitInsert(candidate: CandidateContainer, component: SavedComponent): Promise<void> {
    const overlay = ensureOverlay();
    const inserted = insertPreview(candidate.element, component, session.relation, session.alignment);
    registerInsertedPreview(inserted, candidate.element, component, session.relation, session.alignment);
    session.state = "inserted";
    overlay.hoverOutline.style.display = "none";
    overlay.ghost.style.display = "none";

    const wrapperRect = inserted.wrapper.getBoundingClientRect();
    showRect(overlay.selectedOutline, wrapperRect);
    overlay.label.style.display = "none";

    await sendStatus({
      type: "PREVIEW_INSERTED",
      previewId: inserted.previewId,
      relation: session.relation
    });
  }

  function removeInsertedPreviewById(previewId: string, notify: boolean = true): void {
    const insertedState = session.insertedById.get(previewId);
    if (!insertedState) {
      return;
    }
    insertedState.watcher.stop();
    insertedState.toolbar.unmount();
    insertedState.inserted.wrapper.remove();
    session.insertedById.delete(previewId);
    session.state = session.insertedById.size > 0 ? "inserted" : "idle";
    if (session.activePreviewId === previewId) {
      session.activePreviewId = getLastInsertedPreviewId();
    }
    if (session.overlay) {
      session.overlay.selectedOutline.style.display = "none";
    }
    if (notify) {
      void sendStatus({ type: "PREVIEW_REMOVED", previewId });
    }
  }

  function resetToIdle(): void {
    session.state = "idle";
    session.candidates = [];
    session.activeCandidate = null;
    if (session.overlay) {
      session.overlay.hoverOutline.style.display = "none";
      session.overlay.selectedOutline.style.display = "none";
      session.overlay.ghost.style.display = "none";
      session.overlay.label.style.display = "none";
      session.overlay.controlsHost.style.display = "none";
    }
  }

  function registerInsertedPreview(
    inserted: InsertedPreview,
    host: HTMLElement,
    component: SavedComponent,
    relation: InsertionRelation,
    alignment: PreviewAlignment
  ): void {
    const toolbar = createPreviewToolbar({
      onUndo: () => {
        markPreviewAsActive(inserted.previewId);
        removeInsertedPreviewById(inserted.previewId);
      },
      onRetarget: () => {
        markPreviewAsActive(inserted.previewId);
        removeInsertedPreviewById(inserted.previewId);
        session.component = component;
        void beginTargeting({ type: "BEGIN_TARGETING", component });
      },
      onRelationChange: (nextRelation) => {
        markPreviewAsActive(inserted.previewId);
        replaceInsertedPreviewPlacement(inserted.previewId, nextRelation);
      },
      onAlignmentChange: (nextAlignment) => {
        markPreviewAsActive(inserted.previewId);
        replaceInsertedPreviewPlacement(inserted.previewId, undefined, nextAlignment);
      }
    });
    toolbar.mount(inserted.wrapper, relation, alignment);

    const watcher = watchPreviewRemoval(inserted.previewId, () => {
      session.overlay?.showToast("Preview removed by page update");
      void sendStatus({ type: "PREVIEW_REMOVED", previewId: inserted.previewId });
      removeInsertedPreviewById(inserted.previewId, false);
      if (session.state !== "targeting" && session.insertedById.size === 0) {
        resetToIdle();
      }
    });

    session.insertedById.set(inserted.previewId, {
      inserted,
      toolbar,
      watcher,
      host,
      component,
      relation,
      alignment
    });
    markPreviewAsActive(inserted.previewId);
  }

  function replaceInsertedPreviewPlacement(
    previewId: string,
    nextRelation?: InsertionRelation,
    nextAlignment?: PreviewAlignment
  ): void {
    const existing = session.insertedById.get(previewId);
    if (!existing) {
      return;
    }

    const relation = nextRelation ?? existing.relation;
    const alignment = nextAlignment ?? existing.alignment;
    removeInsertedPreviewById(previewId, false);

    const inserted = insertPreview(existing.host, existing.component, relation, alignment);
    registerInsertedPreview(inserted, existing.host, existing.component, relation, alignment);
  }

  function markPreviewAsActive(previewId: string): void {
    session.activePreviewId = previewId;
  }

  function getLastInsertedPreviewId(): string | null {
    const keys = Array.from(session.insertedById.keys());
    return keys.at(-1) ?? null;
  }

  function teardown(): void {
    for (const preview of session.insertedById.values()) {
      preview.watcher.stop();
      preview.toolbar.unmount();
      preview.inserted.wrapper.remove();
    }
    session.insertedById.clear();
    session.overlay?.destroy();
    document.removeEventListener("mousemove", onPointerMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    delete runtimeWindow.__spectraPreviewRuntimeV1__;
  }

  chrome.runtime.onMessage.addListener(onRuntimeMessage);
  runtimeWindow.__spectraPreviewRuntimeV1__ = { teardown };
})();

function updateCandidatePresentation(
  candidate: CandidateContainer,
  overlay: OverlayRoot,
  relation: InsertionRelation
): void {
  showRect(overlay.hoverOutline, candidate.rect);
  showRect(overlay.selectedOutline, candidate.rect);
  overlay.label.style.display = "block";
  overlay.label.textContent = candidate.element.tagName.toLowerCase();
  overlay.label.style.left = `${Math.max(0, candidate.rect.left)}px`;
  overlay.label.style.top = `${Math.max(0, candidate.rect.top - 24)}px`;
  updateGhostPlacement(overlay.ghost, candidate.rect, relation);
}

function showRect(layer: HTMLElement, rect: DOMRect): void {
  layer.style.display = "block";
  layer.style.left = `${Math.max(0, rect.left)}px`;
  layer.style.top = `${Math.max(0, rect.top)}px`;
  layer.style.width = `${Math.max(1, rect.width)}px`;
  layer.style.height = `${Math.max(1, rect.height)}px`;
}

function pickCandidateAt(x: number, y: number, candidates: CandidateContainer[]): CandidateContainer | null {
  const topElement = document.elementFromPoint(x, y);
  if (!(topElement instanceof Element)) {
    return null;
  }
  for (const candidate of candidates) {
    if (candidate.element === topElement || candidate.element.contains(topElement)) {
      return candidate;
    }
  }
  return candidates[0] ?? null;
}

async function sendStatus(
  message:
    | { type: "PREVIEW_READY" }
    | { type: "PREVIEW_INSERTED"; previewId: string; relation: InsertionRelation }
    | { type: "PREVIEW_REMOVED"; previewId: string }
    | { type: "PREVIEW_ERROR"; code: string; message: string }
): Promise<void> {
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    // Ignore when service worker is unavailable.
  }
}
