import type { ApplySavedPreviewMessage, BeginTargetingMessage } from "../../lib/library/messages";
import type { SavedComponent } from "../../lib/library/types";
import { rankCandidates } from "../candidate-rank";
import { scanCandidateContainers, type CandidateContainer } from "../candidate-scan";
import { mountOverlayRoot, type OverlayRoot } from "../overlay-root";
import { insertPreview } from "../preview-insert";
import {
  createInsertedPreviewRegistry,
  type InsertedPreviewRegistry
} from "./inserted-preview-registry";
import {
  pickCandidateAt,
  showRect,
  updateCandidatePresentation
} from "./helpers";
import { sendRuntimeRequest, sendStatus } from "./runtime-messaging";
import { createSavedPreviewService } from "./saved-preview-service";
import {
  initialPreviewRuntimeState,
  reducePreviewRuntimeState,
  type PreviewRuntimeAction,
  type PreviewRuntimeState
} from "./state-machine";
import {
  createPreviewSessionToolbar,
  type PreviewSessionToolbarControls
} from "../preview-session-toolbar";

export type PreviewRuntime = {
  teardown: () => void;
};

export function createPreviewRuntime(): PreviewRuntime {
  let state: PreviewRuntimeState = initialPreviewRuntimeState;
  let overlay: OverlayRoot | null = null;
  let sessionToolbar: PreviewSessionToolbarControls | null = null;

  const dispatch = (action: PreviewRuntimeAction): void => {
    state = reducePreviewRuntimeState(state, action);
  };

  const syncInsertedState = (preserveTargeting: boolean = false): void => {
    dispatch({
      type: "SYNC_INSERTED",
      insertedCount: registry.size(),
      activePreviewId: registry.getActivePreviewId(),
      preserveTargeting
    });
    if (overlay) {
      overlay.selectedOutline.style.display = "none";
    }
    updateSessionToolbarVisibility();
  };

  const runWithBusyState = async <T>(task: () => Promise<T>): Promise<T> => {
    if (!sessionToolbar) {
      return task();
    }
    sessionToolbar.update({ isBusy: true });
    try {
      return await task();
    } finally {
      sessionToolbar.update({ isBusy: false });
    }
  };

  const registry: InsertedPreviewRegistry = createInsertedPreviewRegistry({
    onActivePreviewChanged: (previewId) => {
      dispatch({ type: "SET_ACTIVE_PREVIEW", previewId });
    },
    onPreviewRemoved: (previewId, notify, reason) => {
      if (reason === "mutation") {
        overlay?.showToast("Preview removed by page update");
      }
      if (notify || reason === "mutation") {
        void sendStatus({ type: "PREVIEW_REMOVED", previewId });
      }
      syncInsertedState(reason === "mutation");
      if (reason === "mutation" && state.mode !== "targeting" && registry.size() === 0) {
        resetToIdle();
      }
    },
    onRetargetRequested: (component) => {
      void beginTargeting({ type: "BEGIN_TARGETING", component });
    }
  });

  const savedPreviewService = createSavedPreviewService({
    runWithBusyState,
    requestRuntime: sendRuntimeRequest,
    getInsertedPreviews: registry.list,
    onInsertResolvedPreview: (host, component, relation, alignment) => {
      const inserted = insertPreview(host, component, relation, alignment);
      registry.register(inserted, host, component, relation, alignment);
      syncInsertedState();
    },
    setSavedPreviews: (previews) => {
      dispatch({ type: "SET_SAVED_PREVIEWS", previews });
      updateSessionToolbarVisibility();
    },
    showToast: (message) => {
      ensureOverlay().showToast(message);
    }
  });

  const onRuntimeMessage = (message: unknown): void => {
    if (!message || typeof message !== "object" || !("type" in message)) {
      return;
    }
    if (isBeginTargetingMessage(message)) {
      void beginTargeting(message);
      return;
    }
    if (isApplySavedPreviewMessage(message)) {
      void savedPreviewService.applySavedPreviewById(message.payload.previewId);
    }
  };

  const onPointerMove = (event: MouseEvent): void => {
    if (state.mode !== "targeting" || !overlay) {
      return;
    }
    const candidate = pickCandidateAt(event.clientX, event.clientY, state.candidates);
    if (!candidate) {
      return;
    }
    dispatch({ type: "SET_ACTIVE_CANDIDATE", candidate });
    updateCandidatePresentation(candidate, overlay, state.relation);
  };

  const onClick = (event: MouseEvent): void => {
    if (state.mode !== "targeting" || !overlay || !state.component) {
      return;
    }
    const candidate = state.activeCandidate;
    if (!candidate) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    commitInsert(candidate, state.component).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to insert preview";
      overlay?.showToast(message);
      void sendStatus({ type: "PREVIEW_ERROR", code: "insert_failed", message });
      resetToIdle();
    });
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && state.mode === "targeting") {
      resetToIdle();
      return;
    }
    if (event.key === "Delete" && registry.size() > 0) {
      const previewId = state.activePreviewId ?? registry.getLastInsertedPreviewId();
      if (previewId) {
        registry.remove(previewId);
      }
    }
  };

  function ensureOverlay(): OverlayRoot {
    if (overlay) {
      return overlay;
    }
    overlay = mountOverlayRoot();
    if (!sessionToolbar) {
      sessionToolbar = createPreviewSessionToolbar({
        onSave: () => {
          void savedPreviewService.saveCurrentPreviewScene();
        },
        onLoadPreviews: () => {
          void savedPreviewService.loadSavedPreviewsForCurrentPage();
        },
        onApplyPreview: (previewId) => {
          void savedPreviewService.applySavedPreviewById(previewId);
        },
        onClearAll: () => {
          clearAllInsertedPreviews();
        },
        onExit: () => {
          exitPreviewMode();
        }
      });
      sessionToolbar.mount(overlay.controlsHost);
    }
    document.addEventListener("mousemove", onPointerMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    return overlay;
  }

  async function beginTargeting(message: BeginTargetingMessage): Promise<void> {
    const runtimeOverlay = ensureOverlay();
    dispatch({ type: "BEGIN_TARGETING", component: message.component });

    const candidates = scanCandidateContainers();
    if (candidates.length === 0) {
      runtimeOverlay.showToast("No valid target containers found");
      await sendStatus({
        type: "PREVIEW_ERROR",
        code: "no_candidates",
        message: "No valid target containers found"
      });
      resetToIdle();
      return;
    }

    const ranked = rankCandidates(candidates, message.component);
    const activeCandidate = ranked[0] ?? null;
    dispatch({
      type: "SET_TARGETING_CANDIDATES",
      candidates: ranked,
      activeCandidate
    });
    if (!activeCandidate) {
      resetToIdle();
      return;
    }
    updateCandidatePresentation(activeCandidate, runtimeOverlay, state.relation);
    await sendStatus({ type: "PREVIEW_READY" });
  }

  async function commitInsert(candidate: CandidateContainer, component: SavedComponent): Promise<void> {
    const runtimeOverlay = ensureOverlay();
    const inserted = insertPreview(candidate.element, component, state.relation, state.alignment);
    registry.register(inserted, candidate.element, component, state.relation, state.alignment);
    syncInsertedState();
    runtimeOverlay.hoverOutline.style.display = "none";
    runtimeOverlay.ghost.style.display = "none";

    const wrapperRect = inserted.wrapper.getBoundingClientRect();
    showRect(runtimeOverlay.selectedOutline, wrapperRect);
    runtimeOverlay.label.style.display = "none";

    await sendStatus({
      type: "PREVIEW_INSERTED",
      previewId: inserted.previewId,
      relation: state.relation
    });
  }

  function resetToIdle(): void {
    dispatch({ type: "RESET_TO_IDLE" });
    if (overlay) {
      overlay.hoverOutline.style.display = "none";
      overlay.selectedOutline.style.display = "none";
      overlay.ghost.style.display = "none";
      overlay.label.style.display = "none";
    }
    updateSessionToolbarVisibility();
  }

  function teardown(): void {
    registry.teardown();
    sessionToolbar?.unmount();
    sessionToolbar = null;
    overlay?.destroy();
    overlay = null;
    document.removeEventListener("mousemove", onPointerMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    chrome.runtime.onMessage.removeListener(onRuntimeMessage);
  }

  function clearAllInsertedPreviews(notify: boolean = true): void {
    registry.clear(notify);
    syncInsertedState();
  }

  function exitPreviewMode(): void {
    clearAllInsertedPreviews(false);
    resetToIdle();
    teardown();
  }

  function updateSessionToolbarVisibility(): void {
    if (!sessionToolbar) {
      return;
    }
    sessionToolbar.update({
      previews: state.savedPreviews
    });
    if (registry.size() > 0) {
      sessionToolbar.show();
      return;
    }
    sessionToolbar.hide();
  }

  chrome.runtime.onMessage.addListener(onRuntimeMessage);

  return {
    teardown
  };
}

function isBeginTargetingMessage(message: { type: unknown }): message is BeginTargetingMessage {
  return message.type === "BEGIN_TARGETING";
}

function isApplySavedPreviewMessage(message: {
  type: unknown;
  payload?: unknown;
}): message is ApplySavedPreviewMessage {
  if (message.type !== "APPLY_SAVED_PREVIEW" || !message.payload || typeof message.payload !== "object") {
    return false;
  }
  return typeof Reflect.get(message.payload, "previewId") === "string";
}
