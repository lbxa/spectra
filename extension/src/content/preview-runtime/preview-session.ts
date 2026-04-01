import type { ApplySavedPreviewMessage, BeginTargetingMessage } from "../../lib/library/messages";
import type { SavedComponent } from "../../lib/library/types";
import { rankCandidates } from "../candidate-rank";
import { scanCandidateContainers, type CandidateContainer } from "../candidate-scan";
import { insertPreview } from "../preview-insert";
import { playExtensionSound } from "../extension-audio";
import {
  installCaptureInteractionGuards,
  resolveSelectedTarget
} from "../capture/selection-runtime";
import { createInteractionController } from "../targeting/interaction-controller";
import { syncParentOutlineForTarget } from "../targeting/parent-outline";
import {
  createInsertedPreviewRegistry,
  type InsertedPreviewRegistry
} from "./inserted-preview-registry";
import { pickCandidateAt } from "./helpers";
import { sendRuntimeRequest, sendStatus } from "./runtime-messaging";
import { createSavedPreviewService } from "./saved-preview-service";
import {
  getModeKind,
  initialPreviewRuntimeState,
  reducePreviewRuntimeState,
  type PreviewRuntimeAction,
  type PreviewRuntimeState
} from "./state-machine";
import { createRuntimeDiagnostic } from "./diagnostics";
import { createPreviewOverlayManager } from "./overlay-manager";
import {
  applyTargetingCandidateEffect,
  clearAllChromeEffect,
  clearTargetingChromeEffect,
  showInsertedSelectionEffect
} from "./preview-effects";

export type PreviewSessionRuntime = {
  teardown: () => void;
};

type PreviewSessionOptions = {
  onTeardown?: () => void;
};

export function createPreviewSession(options: PreviewSessionOptions = {}): PreviewSessionRuntime {
  let state: PreviewRuntimeState = initialPreviewRuntimeState;
  let lastHoveredTarget: Element | null = null;

  const dispatch = (action: PreviewRuntimeAction): void => {
    state = reducePreviewRuntimeState(state, action);
  };

  const modeKind = (): ReturnType<typeof getModeKind> => getModeKind(state);
  const isTargetingMode = (): boolean => modeKind() === "targeting";

  const updateParentOutlineForTarget = (target: Element | null, isShiftHeld: boolean): void => {
    const overlay = overlayManager.getOverlay();
    if (!overlay) {
      return;
    }
    syncParentOutlineForTarget(overlay.parentOutline, target, isShiftHeld);
  };

  const updateActiveCandidateFromTarget = (target: Element | null, isShiftHeld: boolean): void => {
    const overlay = overlayManager.getOverlay();
    if (!overlay || !isTargetingMode() || !target) {
      return;
    }
    const resolvedTarget = resolveSelectedTarget(target, isShiftHeld);
    const candidate = pickCandidateAt(0, 0, state.candidates, resolvedTarget);
    dispatch({ type: "SET_ACTIVE_CANDIDATE", candidate });
    if (candidate) {
      applyTargetingCandidateEffect(overlay, candidate, state.relation);
    }
  };

  const syncShortcutHud = (): void => {
    overlayManager.setShortcutsVisible(isTargetingMode());
  };

  const syncToolbar = (isBusy: boolean = false): void => {
    overlayManager.updateToolbar({
      previews: state.savedPreviews,
      hasInsertedPreviews: registry.size() > 0,
      isBusy
    });
  };

  const syncInsertedState = (preserveTargeting: boolean = false): void => {
    dispatch({
      type: "SYNC_INSERTED",
      insertedCount: registry.size(),
      activePreviewId: registry.getActivePreviewId(),
      preserveTargeting
    });
    const overlay = overlayManager.getOverlay();
    if (overlay) {
      overlay.selectedOutline.style.display = "none";
      updateParentOutlineForTarget(null, false);
    }
    if (!isTargetingMode()) {
      lastHoveredTarget = null;
    }
    syncShortcutHud();
    syncToolbar();
  };

  const runWithBusyState = async <T>(task: () => Promise<T>): Promise<T> => {
    syncToolbar(true);
    try {
      return await task();
    } finally {
      syncToolbar(false);
    }
  };

  const resetToIdle = (): void => {
    dispatch({ type: "RESET_TO_IDLE" });
    const overlay = overlayManager.getOverlay();
    if (overlay) {
      clearAllChromeEffect(overlay);
    }
    lastHoveredTarget = null;
    syncShortcutHud();
    syncToolbar();
  };

  const beginTargeting = async (message: BeginTargetingMessage): Promise<void> => {
    ensureSurfaceMounted();
    dispatch({ type: "BEGIN_TARGETING", component: message.component });
    dispatch({ type: "CLEAR_DIAGNOSTICS" });
    syncShortcutHud();

    const candidates = scanCandidateContainers();
    if (candidates.length === 0) {
      const diagnostic = createRuntimeDiagnostic({
        code: "anchor_not_found",
        message: "No valid target containers found",
        severity: "error"
      });
      dispatch({ type: "ADD_DIAGNOSTIC", diagnostic });
      overlayManager.showToast(diagnostic.message);
      await sendStatus({
        type: "PREVIEW_ERROR",
        code: "no_candidates",
        message: diagnostic.message
      });
      dispatch({ type: "SET_ERROR_MODE", message: diagnostic.message });
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
    const overlay = overlayManager.getOverlay();
    if (overlay) {
      lastHoveredTarget = activeCandidate.element;
      applyTargetingCandidateEffect(overlay, activeCandidate, state.relation);
    }
    await sendStatus({ type: "PREVIEW_READY" });
  };

  const commitInsert = async (candidate: CandidateContainer, component: SavedComponent): Promise<void> => {
    ensureSurfaceMounted();
    const overlay = overlayManager.getOverlay();
    if (!overlay) {
      return;
    }
    const inserted = insertPreview(candidate.element, component, state.relation, state.alignment);
    registry.register(inserted, candidate.element, component, state.relation, state.alignment);
    syncInsertedState();
    clearTargetingChromeEffect(overlay);
    showInsertedSelectionEffect(overlay, inserted.wrapper.getBoundingClientRect());

    await sendStatus({
      type: "PREVIEW_INSERTED",
      previewId: inserted.previewId,
      relation: state.relation
    });
  };

  const clearAllInsertedPreviews = (notify: boolean = true): void => {
    registry.clear(notify);
    syncInsertedState();
  };

  const exitPreviewMode = (): void => {
    clearAllInsertedPreviews(false);
    resetToIdle();
    teardown();
  };

  let savedPreviewService: ReturnType<typeof createSavedPreviewService>;

  const overlayManager = createPreviewOverlayManager({
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

  const interactionController = createInteractionController({
    isActive: isTargetingMode,
    isKeyActive: () => isTargetingMode() || registry.size() > 0,
    installGuards: installCaptureInteractionGuards,
    onHover: (event, target, context) => {
      if (!isTargetingMode()) {
        return;
      }
      const overlay = overlayManager.getOverlay();
      if (!overlay) {
        return;
      }
      lastHoveredTarget = target;
      updateParentOutlineForTarget(target, context.isShiftHeld);
      const resolvedTarget = resolveSelectedTarget(target, context.isShiftHeld);
      const candidate = pickCandidateAt(event.clientX, event.clientY, state.candidates, resolvedTarget);
      dispatch({ type: "SET_ACTIVE_CANDIDATE", candidate });
      if (candidate) {
        applyTargetingCandidateEffect(overlay, candidate, state.relation);
      }
    },
    onCommit: (event) => {
      if (!isTargetingMode() || !state.component) {
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
        const diagnostic = createRuntimeDiagnostic({
          code: "partial_apply",
          message,
          severity: "error"
        });
        dispatch({ type: "ADD_DIAGNOSTIC", diagnostic });
        overlayManager.showToast(message);
        void sendStatus({ type: "PREVIEW_ERROR", code: "insert_failed", message });
        resetToIdle();
      });
    },
    onCancel: () => {
      if (isTargetingMode()) {
        resetToIdle();
      }
    },
    onDelete: () => {
      if (registry.size() <= 0) {
        return;
      }
      const previewId = state.activePreviewId ?? registry.getLastInsertedPreviewId();
      if (previewId) {
        registry.remove(previewId);
      }
    },
    onModifierChange: ({ isShiftHeld }) => {
      overlayManager.setShiftActive(isShiftHeld);
      const target = lastHoveredTarget ?? state.activeCandidate?.element ?? null;
      updateParentOutlineForTarget(target, isShiftHeld);
      updateActiveCandidateFromTarget(target, isShiftHeld);
    }
  });

  const registry: InsertedPreviewRegistry = createInsertedPreviewRegistry({
    onActivePreviewChanged: (previewId) => {
      dispatch({ type: "SET_ACTIVE_PREVIEW", previewId });
    },
    onPreviewRemoved: (previewId, notify, reason) => {
      if (reason === "mutation") {
        overlayManager.showToast("Preview removed by page update");
      }
      if (notify || reason === "mutation") {
        void sendStatus({ type: "PREVIEW_REMOVED", previewId });
      }
      syncInsertedState(reason === "mutation");
      if (reason === "mutation" && !isTargetingMode() && registry.size() === 0) {
        resetToIdle();
      }
    },
    onRetargetRequested: (component) => {
      void beginTargeting({ type: "BEGIN_TARGETING", component });
    }
  });

  savedPreviewService = createSavedPreviewService({
    runWithBusyState,
    requestRuntime: sendRuntimeRequest,
    getInsertedPreviews: registry.list,
    onInsertResolvedPreview: (host, component, relation, alignment) => {
      const inserted = insertPreview(host, component, relation, alignment);
      registry.register(inserted, host, component, relation, alignment);
      syncInsertedState();
    },
    onDiagnostics: (diagnostics) => {
      for (const diagnostic of diagnostics) {
        dispatch({ type: "ADD_DIAGNOSTIC", diagnostic });
      }
    },
    setSavedPreviews: (previews) => {
      dispatch({ type: "SET_SAVED_PREVIEWS", previews });
      syncToolbar();
    },
    showToast: (message) => {
      overlayManager.showToast(message);
    },
    playOptimisticSaveJingle: () => {
      void playExtensionSound("click.wav");
    },
    showSuccessFlash: () => {
      overlayManager.showFlash();
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

  const ensureSurfaceMounted = (): void => {
    overlayManager.ensureMounted();
    interactionController.start();
  };

  const teardown = (): void => {
    registry.teardown();
    interactionController.stop();
    overlayManager.destroy();
    chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    options.onTeardown?.();
  };

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
