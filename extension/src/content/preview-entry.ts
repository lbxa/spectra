import type {
  ApplySavedPreviewMessage,
  ApplySavedPreviewResponse,
  BeginTargetingMessage,
  InsertionRelation,
  ListSavedPreviewsForPageMessage,
  ListSavedPreviewsForPageResponse,
  PreviewAlignment,
  SavePreviewSceneMessage,
  SavePreviewSceneResponse
} from "../lib/library/messages";
import type {
  AnchorSpec,
  SavedComponent,
  SavedPreview,
  SavedPreviewApplyResult,
  SavedPreviewListItem,
  SavedPreviewTarget
} from "../lib/library/types";
import { rankCandidates } from "./candidate-rank";
import { scanCandidateContainers, type CandidateContainer } from "./candidate-scan";
import { updateGhostPlacement } from "./ghost-placement";
import { watchPreviewRemoval, type PreviewMutationWatcher } from "./mutation-watch";
import { mountOverlayRoot, type OverlayRoot } from "./overlay-root";
import { insertPreview, type InsertedPreview } from "./preview-insert";
import { createPreviewToolbar, type PreviewToolbarControls } from "./preview-toolbar";
import { createPreviewSessionToolbar, type PreviewSessionToolbarControls } from "./preview-session-toolbar";

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
  sessionToolbar: PreviewSessionToolbarControls | null;
  savedPreviews: SavedPreviewListItem[];
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
    activePreviewId: null,
    sessionToolbar: null,
    savedPreviews: []
  };

  const onRuntimeMessage = (message: unknown): void => {
    if (!message || typeof message !== "object" || !("type" in message)) {
      return;
    }
    if (isBeginTargetingMessage(message)) {
      void beginTargeting(message);
      return;
    }
    if (isApplySavedPreviewMessage(message)) {
      void applySavedPreviewById(message.payload.previewId);
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
    if (!session.sessionToolbar) {
      session.sessionToolbar = createPreviewSessionToolbar({
        onSave: () => {
          void saveCurrentPreviewScene();
        },
        onLoadPreviews: () => {
          void loadSavedPreviewsForCurrentPage();
        },
        onApplyPreview: (previewId) => {
          void applySavedPreviewById(previewId);
        },
        onClearAll: () => {
          clearAllInsertedPreviews();
        },
        onExit: () => {
          exitPreviewMode();
        }
      });
      session.sessionToolbar.mount(session.overlay.controlsHost);
    }
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
    updateSessionToolbarVisibility();
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
    }
    updateSessionToolbarVisibility();
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
    updateSessionToolbarVisibility();
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
    session.sessionToolbar?.unmount();
    session.sessionToolbar = null;
    session.overlay?.destroy();
    document.removeEventListener("mousemove", onPointerMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    delete runtimeWindow.__spectraPreviewRuntimeV1__;
  }

  function clearAllInsertedPreviews(notify: boolean = true): void {
    const previewIds = Array.from(session.insertedById.keys());
    for (const previewId of previewIds) {
      removeInsertedPreviewById(previewId, notify);
    }
    updateSessionToolbarVisibility();
  }

  function exitPreviewMode(): void {
    clearAllInsertedPreviews(false);
    resetToIdle();
    teardown();
  }

  function updateSessionToolbarVisibility(): void {
    if (!session.sessionToolbar) {
      return;
    }
    session.sessionToolbar.update({
      previews: session.savedPreviews
    });
    if (session.insertedById.size > 0) {
      session.sessionToolbar.show();
      return;
    }
    session.sessionToolbar.hide();
  }

  async function saveCurrentPreviewScene(): Promise<void> {
    if (session.insertedById.size === 0) {
      session.overlay?.showToast("Place at least one component first");
      return;
    }
    if (!session.sessionToolbar) {
      return;
    }
    session.sessionToolbar.update({ isBusy: true });

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
      instances: Array.from(session.insertedById.values()).map((insertedState, index) => ({
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

    const response = await sendRuntimeRequest<SavePreviewSceneResponse>({
      type: "SAVE_PREVIEW_SCENE",
      payload: scene
    } satisfies SavePreviewSceneMessage);

    session.sessionToolbar.update({ isBusy: false });
    if (!response || !response.ok) {
      session.overlay?.showToast(response?.error || "Could not save preview");
      return;
    }
    session.overlay?.showToast("Preview saved");
    await loadSavedPreviewsForCurrentPage();
  }

  async function loadSavedPreviewsForCurrentPage(): Promise<void> {
    if (!session.sessionToolbar) {
      return;
    }
    session.sessionToolbar.update({ isBusy: true });
    const target = buildPreviewTarget();
    const response = await sendRuntimeRequest<ListSavedPreviewsForPageResponse>({
      type: "LIST_SAVED_PREVIEWS_FOR_PAGE",
      payload: {
        origin: target.origin,
        pathname: target.pathname
      }
    } satisfies ListSavedPreviewsForPageMessage);

    session.sessionToolbar.update({ isBusy: false });
    session.savedPreviews = response?.ok ? response.previews : [];
    updateSessionToolbarVisibility();
    if (!response || !response.ok) {
      session.overlay?.showToast(response?.error || "Could not load saved previews");
    }
  }

  async function applySavedPreviewById(previewId: string): Promise<void> {
    const overlay = ensureOverlay();
    if (!session.sessionToolbar) {
      overlay.showToast("Could not initialize preview controls");
      return;
    }
    session.sessionToolbar.update({ isBusy: true });
    const response = await sendRuntimeRequest<ApplySavedPreviewResponse>({
      type: "APPLY_SAVED_PREVIEW",
      payload: {
        previewId
      }
    } satisfies ApplySavedPreviewMessage);
    session.sessionToolbar.update({ isBusy: false });
    if (!response || !response.ok || !response.preview) {
      overlay.showToast(response?.error || "Could not apply saved preview");
      return;
    }
    const componentById = new Map(
      (response.components ?? []).map((component) => [component.id, component] as const)
    );
    const results = applySavedPreviewScene(response.preview, componentById);
    const appliedCount = results.filter(
      (result) => result.status === "applied" || result.status === "applied_with_fallback"
    ).length;
    const total = results.length;
    if (appliedCount === total) {
      overlay.showToast(`Applied ${appliedCount} component(s)`);
      return;
    }
    overlay.showToast(`Applied ${appliedCount}/${total} component(s)`);
  }

  function applySavedPreviewScene(
    preview: SavedPreview,
    componentById: Map<string, SavedComponent>
  ): SavedPreviewApplyResult[] {
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
      const inserted = insertPreview(
        pending.resolution.element,
        pending.component,
        pending.instance.placement.insertionMode,
        pending.instance.placement.alignment
      );
      registerInsertedPreview(
        inserted,
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

async function sendRuntimeRequest<TResponse>(message: unknown): Promise<TResponse> {
  const response = await chrome.runtime.sendMessage(message);
  // TODO: tighten runtime response validation once preview command contracts are stabilized.
  return response as TResponse;
}

function buildPreviewTarget(): SavedPreviewTarget {
  const url = new URL(window.location.href);
  return {
    origin: url.origin,
    pathname: normalizePathname(url.pathname),
    matchMode: "exact_path",
    canonicalUrl: window.location.href
  };
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, normalized.length - 1)
    : normalized;
}

function buildAnchorSpec(host: HTMLElement): AnchorSpec {
  const primarySelector = buildElementSelector(host);
  const fallbackSelectors = host.parentElement ? [buildElementSelector(host.parentElement)] : [];
  return {
    strategy: "selector",
    primarySelector,
    fallbackSelectors
  };
}

function buildElementSelector(element: Element): string {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }
  const segments: string[] = [];
  let cursor: Element | null = element;
  while (cursor && cursor.tagName.toLowerCase() !== "html") {
    const cursorElement: Element = cursor;
    const tagName = cursorElement.tagName.toLowerCase();
    const parentElement: HTMLElement | null = cursorElement.parentElement;
    if (!parentElement) {
      segments.unshift(tagName);
      break;
    }
    const siblings = Array.from(parentElement.children).filter(
      (child): child is Element => child instanceof Element && child.tagName === cursorElement.tagName
    );
    const nth = siblings.indexOf(cursorElement) + 1;
    segments.unshift(`${tagName}:nth-of-type(${nth})`);
    cursor = parentElement;
  }
  return segments.join(" > ");
}

function resolveAnchor(anchor: AnchorSpec): {
  element: HTMLElement | null;
  selector?: string;
  usedFallback: boolean;
} {
  if (anchor.primarySelector) {
    const primaryMatch = document.querySelector(anchor.primarySelector);
    if (primaryMatch instanceof HTMLElement) {
      return {
        element: primaryMatch,
        selector: anchor.primarySelector,
        usedFallback: false
      };
    }
  }

  for (const fallbackSelector of anchor.fallbackSelectors) {
    const fallbackMatch = document.querySelector(fallbackSelector);
    if (fallbackMatch instanceof HTMLElement) {
      return {
        element: fallbackMatch,
        selector: fallbackSelector,
        usedFallback: true
      };
    }
  }

  return {
    element: null,
    usedFallback: false
  };
}

function buildNormalizedLayout(
  wrapper: HTMLElement,
  referenceViewport: { width: number; height: number }
): SavedPreview["instances"][number]["layout"] {
  const rect = wrapper.getBoundingClientRect();
  return {
    referenceViewport,
    normalizedRect: {
      x: clampUnit(rect.left / referenceViewport.width),
      y: clampUnit(rect.top / referenceViewport.height),
      width: clampUnit(rect.width / referenceViewport.width),
      height: clampUnit(rect.height / referenceViewport.height)
    }
  };
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function isBeginTargetingMessage(message: {
  type: unknown;
}): message is BeginTargetingMessage {
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
