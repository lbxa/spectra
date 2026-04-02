import type {
  ApplySavedPreviewMessage,
  BeginTargetingMessage,
  SaveDerivedComponentResponse
} from "../../lib/library/messages";
import type { SavedComponent } from "../../lib/library/types";
import { rankCandidates } from "../candidate-rank";
import { scanCandidateContainers, type CandidateContainer } from "../candidate-scan";
import { insertPreview } from "../preview-insert";
import { playExtensionSound } from "../extension-audio";
import { buildComponentPack } from "../adapt/build-component-pack";
import { applyAdaptationPatch } from "../adapt/apply-adaptation-patch";
import { requestAdaptation } from "../adapt/request-adaptation";
import { validateAdaptationPatch } from "../adapt/validate-adaptation-patch";
import { extractTargetSiteContext } from "../theme/extract-target-site-context";
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

export type PreviewSessionMessaging = {
  sendStatus: typeof sendStatus;
  sendRuntimeRequest: <TResponse>(message: unknown) => Promise<TResponse>;
  subscribeRuntimeMessages: (listener: (message: unknown) => void) => () => void;
};

export type PreviewSessionAdaptationDeps = {
  extractTargetSiteContext: typeof extractTargetSiteContext;
  buildComponentPack: typeof buildComponentPack;
  requestAdaptation: typeof requestAdaptation;
  validateAdaptationPatch: typeof validateAdaptationPatch;
  applyAdaptationPatch: typeof applyAdaptationPatch;
};

export type PreviewSessionOptions = {
  onTeardown?: () => void;
  messaging?: PreviewSessionMessaging;
  adaptation?: PreviewSessionAdaptationDeps;
};

const defaultMessaging: PreviewSessionMessaging = {
  sendStatus,
  sendRuntimeRequest,
  subscribeRuntimeMessages: (listener) => {
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }
};

const defaultAdaptationDeps: PreviewSessionAdaptationDeps = {
  extractTargetSiteContext,
  buildComponentPack,
  requestAdaptation,
  validateAdaptationPatch,
  applyAdaptationPatch
};

export function createPreviewSession(options: PreviewSessionOptions = {}): PreviewSessionRuntime {
  const messaging = options.messaging ?? defaultMessaging;
  const adaptation = options.adaptation ?? defaultAdaptationDeps;
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
      await messaging.sendStatus({
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
    await messaging.sendStatus({ type: "PREVIEW_READY" });
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

    await messaging.sendStatus({
      type: "PREVIEW_INSERTED",
      previewId: inserted.previewId,
      relation: state.relation
    });
  };

  const clearAllInsertedPreviews = (notify: boolean = true): void => {
    registry.clear(notify);
    syncInsertedState();
  };

  const hasPreview = (previewId: string): boolean =>
    registry.list().some((record) => record.inserted.previewId === previewId);

  const runMagicAdaptation = async (previewId: string, component: SavedComponent): Promise<void> => {
    if (!hasPreview(previewId)) {
      return;
    }
    registry.setMagicState(previewId, "loading");
    await messaging.sendStatus({ type: "MAGIC_CLICKED", previewId, componentId: component.id });
    await messaging.sendStatus({ type: "MAGIC_REQUEST_STARTED", previewId, componentId: component.id });

    try {
      await runWithBusyState(async () => {
        const record = registry.list().find((entry) => entry.inserted.previewId === previewId);
        if (!record) {
          throw new Error("Preview no longer exists");
        }
        const targetSiteContext = adaptation.extractTargetSiteContext(record.host);
        const componentPack = adaptation.buildComponentPack(component);
        targetSiteContext.hardConstraints.protectedNodeIds = componentPack.protectedNodeIds;

        const adaptationResponse = await adaptation.requestAdaptation({
          targetSiteContext,
          componentPack
        });
        if (!adaptationResponse.ok || !adaptationResponse.patch) {
          throw new Error(adaptationResponse.error || "Adaptation request failed");
        }
        await messaging.sendStatus({ type: "MAGIC_REQUEST_SUCCEEDED", previewId, componentId: component.id });

        const validation = adaptation.validateAdaptationPatch(adaptationResponse.patch, componentPack);
        if (!validation.ok) {
          const diagnostic = createRuntimeDiagnostic({
            code: "patch_rejected",
            message: validation.reason,
            severity: "warning"
          });
          dispatch({ type: "ADD_DIAGNOSTIC", diagnostic });
          overlayManager.showToast(validation.reason);
          await messaging.sendStatus({
            type: "MAGIC_PATCH_REJECTED",
            previewId,
            componentId: component.id,
            message: validation.reason
          });
          registry.setMagicState(previewId, "error");
          return;
        }

        const applied = adaptation.applyAdaptationPatch(componentPack, adaptationResponse.patch);
        await messaging.sendStatus({
          type: "MAGIC_PATCH_APPLIED",
          previewId,
          componentId: component.id,
          message: adaptationResponse.patch.summary
        });

        const saveResponse = await messaging.sendRuntimeRequest<SaveDerivedComponentResponse>({
          type: "SAVE_DERIVED_COMPONENT",
          payload: {
            sourceComponentId: component.id,
            html: applied.html,
            cssText: applied.cssText,
            summary: adaptationResponse.patch.summary,
            warnings: [...adaptationResponse.patch.warnings, ...applied.warnings],
            confidence: adaptationResponse.patch.confidence,
            themeFingerprint: targetSiteContext.metadata.themeFingerprint
          }
        });

        if (!saveResponse?.ok || !saveResponse.component) {
          throw new Error(saveResponse?.error || "Failed to save adapted revision");
        }

        if (hasPreview(previewId)) {
          registry.replaceComponent(previewId, saveResponse.component);
          syncInsertedState();
          registry.setMagicState(previewId, "success");
        }

        await messaging.sendStatus({
          type: "MAGIC_ADAPTED_REVISION_SAVED",
          previewId,
          componentId: saveResponse.component.id
        });
        overlayManager.showToast("Component adapted");
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to adapt component";
      const diagnostic = createRuntimeDiagnostic({
        code: "partial_apply",
        message,
        severity: "error"
      });
      dispatch({ type: "ADD_DIAGNOSTIC", diagnostic });
      overlayManager.showToast(message);
      if (hasPreview(previewId)) {
        registry.setMagicState(previewId, "error");
      }
      await messaging.sendStatus({
        type: "MAGIC_REQUEST_FAILED",
        previewId,
        componentId: component.id,
        code: "adaptation_failed",
        message
      });
    } finally {
      window.setTimeout(() => {
        if (hasPreview(previewId)) {
          registry.setMagicState(previewId, "idle");
        }
      }, 1200);
    }
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
        void messaging.sendStatus({ type: "PREVIEW_ERROR", code: "insert_failed", message });
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
        void messaging.sendStatus({ type: "PREVIEW_REMOVED", previewId });
      }
      syncInsertedState(reason === "mutation");
      if (reason === "mutation" && !isTargetingMode() && registry.size() === 0) {
        resetToIdle();
      }
    },
    onRetargetRequested: (component) => {
      void beginTargeting({ type: "BEGIN_TARGETING", component });
    },
    onMagicRequested: (previewId: string, component: SavedComponent) => {
      void runMagicAdaptation(previewId, component);
    }
  });

  savedPreviewService = createSavedPreviewService({
    runWithBusyState,
    requestRuntime: messaging.sendRuntimeRequest,
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

  const unsubscribeRuntimeMessages = messaging.subscribeRuntimeMessages(onRuntimeMessage);

  const teardown = (): void => {
    registry.teardown();
    interactionController.stop();
    overlayManager.destroy();
    unsubscribeRuntimeMessages();
    options.onTeardown?.();
  };

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
