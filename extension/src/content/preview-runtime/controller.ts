import type { ApplySavedPreviewMessage, BeginTargetingMessage } from "../../lib/library/messages";
import type { SavedComponent } from "../../lib/library/types";
import { rankCandidates } from "../candidate-rank";
import { scanCandidateContainers, type CandidateContainer } from "../candidate-scan";
import { mountOverlayRoot, type OverlayRoot } from "../overlay-root";
import { insertPreview } from "../preview-insert";
import { playExtensionSound } from "../extension-audio";
import {
  createShortcutsHud,
  type ShortcutsHudApi
} from "../picker-ui/ShortcutsHud";
import {
  createInsertedPreviewRegistry,
  type InsertedPreviewRegistry
} from "./inserted-preview-registry";
import {
  pickCandidateAt,
  showRect,
  updateCandidatePresentation
} from "./helpers";
import {
  installCaptureInteractionGuards,
  resolveSelectedTarget
} from "../capture/selection-runtime";
import { createInteractionController } from "../targeting/interaction-controller";
import { hideParentOutline, syncParentOutlineForTarget } from "../targeting/parent-outline";
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

type PreviewRuntimeOptions = {
  onTeardown?: () => void;
};

export function createPreviewRuntime(options: PreviewRuntimeOptions = {}): PreviewRuntime {
  let state: PreviewRuntimeState = initialPreviewRuntimeState;
  let overlay: OverlayRoot | null = null;
  let sessionToolbar: PreviewSessionToolbarControls | null = null;
  let shortcutsHud: ShortcutsHudApi | null = null;
  let lastHoveredTarget: Element | null = null;
  const updateParentOutlineForTarget = (target: Element | null, isShiftHeld: boolean): void => {
    if (!overlay) {
      return;
    }
    syncParentOutlineForTarget(overlay.parentOutline, target, isShiftHeld);
  };
  const updateActiveCandidateFromTarget = (target: Element | null, isShiftHeld: boolean): void => {
    if (!overlay || state.mode !== "targeting" || !target) {
      return;
    }
    const resolvedTarget = resolveSelectedTarget(target, isShiftHeld);
    const candidate = pickCandidateAt(0, 0, state.candidates, resolvedTarget);
    dispatch({ type: "SET_ACTIVE_CANDIDATE", candidate });
    if (candidate) {
      updateCandidatePresentation(candidate, overlay, state.relation);
    }
  };
  const interactionController = createInteractionController({
    isActive: () => state.mode === "targeting",
    installGuards: installCaptureInteractionGuards,
    onHover: (event, _target, context) => {
      if (!overlay || state.mode !== "targeting") {
        return;
      }
      lastHoveredTarget = _target;
      updateParentOutlineForTarget(_target, context.isShiftHeld);
      const resolvedTarget = resolveSelectedTarget(_target, context.isShiftHeld);
      const candidate = pickCandidateAt(event.clientX, event.clientY, state.candidates, resolvedTarget);
      dispatch({ type: "SET_ACTIVE_CANDIDATE", candidate });
      if (candidate) {
        updateCandidatePresentation(candidate, overlay, state.relation);
      }
    },
    onCommit: (event) => {
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
    },
    onCancel: () => {
      if (state.mode === "targeting") {
        resetToIdle();
      }
    },
    onModifierChange: ({ isShiftHeld }) => {
      shortcutsHud?.setShiftActive(isShiftHeld);
      const target = lastHoveredTarget ?? state.activeCandidate?.element ?? null;
      updateParentOutlineForTarget(target, isShiftHeld);
      updateActiveCandidateFromTarget(target, isShiftHeld);
    }
  });

  const onGlobalDelete = (event: KeyboardEvent): void => {
    if (event.key !== "Delete" || registry.size() <= 0) {
      return;
    }
    const previewId = state.activePreviewId ?? registry.getLastInsertedPreviewId();
    if (previewId) {
      registry.remove(previewId);
    }
  };

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
      hideParentOutline(overlay.parentOutline);
    }
    if (state.mode !== "targeting") {
      lastHoveredTarget = null;
    }
    syncShortcutHud();
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
    },
    playOptimisticSaveJingle: () => {
      void playExtensionSound("jingle.wav");
    },
    showSuccessFlash: () => {
      ensureOverlay().showFlash();
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

  function ensureOverlay(): OverlayRoot {
    if (overlay) {
      return overlay;
    }
    overlay = mountOverlayRoot();
    if (!shortcutsHud) {
      shortcutsHud = createShortcutsHud({ escapeDescription: "Exit preview" });
    }
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
    interactionController.start();
    document.addEventListener("keydown", onGlobalDelete, true);
    return overlay;
  }

  async function beginTargeting(message: BeginTargetingMessage): Promise<void> {
    const runtimeOverlay = ensureOverlay();
    dispatch({ type: "BEGIN_TARGETING", component: message.component });
    syncShortcutHud();

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
    lastHoveredTarget = activeCandidate.element;
    updateCandidatePresentation(activeCandidate, runtimeOverlay, state.relation);
    await sendStatus({ type: "PREVIEW_READY" });
  }

  async function commitInsert(candidate: CandidateContainer, component: SavedComponent): Promise<void> {
    const runtimeOverlay = ensureOverlay();
    const inserted = insertPreview(candidate.element, component, state.relation, state.alignment);
    registry.register(inserted, candidate.element, component, state.relation, state.alignment);
    syncInsertedState();
    runtimeOverlay.hoverOutline.style.display = "none";
    hideParentOutline(runtimeOverlay.parentOutline);
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
      hideParentOutline(overlay.parentOutline);
      overlay.selectedOutline.style.display = "none";
      overlay.ghost.style.display = "none";
      overlay.label.style.display = "none";
    }
    lastHoveredTarget = null;
    syncShortcutHud();
    updateSessionToolbarVisibility();
  }

  function syncShortcutHud(): void {
    if (!shortcutsHud) {
      return;
    }
    const isTargeting = state.mode === "targeting";
    shortcutsHud.setVisible(isTargeting);
    if (!isTargeting) {
      shortcutsHud.setShiftActive(false);
    }
  }

  function teardown(): void {
    registry.teardown();
    sessionToolbar?.unmount();
    sessionToolbar = null;
    interactionController.stop();
    document.removeEventListener("keydown", onGlobalDelete, true);
    overlay?.destroy();
    overlay = null;
    shortcutsHud?.destroy();
    shortcutsHud = null;
    chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    options.onTeardown?.();
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
