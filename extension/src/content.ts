import { getCaptureFailureMessage } from "./content/capture-runtime-bridge";
import {
  collectMatchedScopedCssText,
  createCaptureScopeSelector,
  markScopedCss,
  rewriteAssetUrls,
  sanitizeClonedTree
} from "./content/capture-snapshot";
import { createPickerUi, type PickerUiApi } from "./content/picker-ui/PickerUiRoot";

(() => {
type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type SaveComponentPayload = {
  html: string;
  cssText: string;
  url: string;
  title: string;
  bounds: Bounds;
  devicePixelRatio: number;
  sourceHostSignature: {
    landmark: "header" | "hero" | "main" | "section" | "article" | "aside" | "nav" | "footer" | "form" | "unknown";
    hostTag: string;
    layoutMode: "block" | "flex-row" | "flex-column" | "grid" | "inline" | "unknown";
    widthBucket: "xs" | "sm" | "md" | "lg" | "xl";
    depth: number;
    siblingCount: number;
    repeatedSiblingTag?: string;
    ancestorTags: string[];
    nearbyHeading?: string;
  };
};

type SaveComponentMessage = {
  type: "SAVE_COMPONENT";
  payload: SaveComponentPayload;
};

type SaveComponentResponse = {
  ok: boolean;
  error?: string;
  previewDataUrl?: string;
};

type SelectionState = {
  overlay: HTMLDivElement;
  parentOverlay: HTMLDivElement;
  ui: PickerUiApi;
  lastHoveredElement: Element | null;
  isDone: boolean;
};

type PickerWindow = Window & {
  __componentPickerSelectionState__?: SelectionState;
};

const FRAME_WAIT_TIMEOUT_MS = 120;
const INLINE_STYLE_TAG_BLOCKLIST = new Set(["style", "script", "meta", "link", "title"]);

const STYLE_PROPERTY_ALLOWLIST = new Set<string>([
  "display",
  "visibility",
  "opacity",
  "position",
  "z-index",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "inset-block",
  "inset-inline",
  "inset-block-start",
  "inset-block-end",
  "inset-inline-start",
  "inset-inline-end",
  "box-sizing",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "inline-size",
  "block-size",
  "min-inline-size",
  "min-block-size",
  "max-inline-size",
  "max-block-size",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-width",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-style",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "outline",
  "outline-width",
  "outline-style",
  "outline-color",
  "outline-offset",
  "overflow",
  "overflow-x",
  "overflow-y",
  "object-fit",
  "object-position",
  "background",
  "background-color",
  "background-image",
  "background-position",
  "background-size",
  "background-repeat",
  "background-origin",
  "background-clip",
  "background-attachment",
  "box-shadow",
  "filter",
  "backdrop-filter",
  "transform",
  "transform-origin",
  "transform-style",
  "translate",
  "rotate",
  "scale",
  "perspective",
  "perspective-origin",
  "clip-path",
  "mix-blend-mode",
  "isolation",
  "color",
  "font",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-stretch",
  "font-variant",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "text-align",
  "text-transform",
  "text-decoration",
  "text-decoration-line",
  "text-decoration-style",
  "text-decoration-color",
  "text-decoration-thickness",
  "text-underline-offset",
  "text-overflow",
  "text-shadow",
  "text-indent",
  "white-space",
  "word-break",
  "overflow-wrap",
  "vertical-align",
  "list-style",
  "list-style-type",
  "list-style-position",
  "list-style-image",
  "cursor",
  "pointer-events",
  "user-select",
  "appearance",
  "flex",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "flex-direction",
  "flex-wrap",
  "gap",
  "row-gap",
  "column-gap",
  "order",
  "align-items",
  "align-self",
  "align-content",
  "justify-content",
  "justify-items",
  "justify-self",
  "place-items",
  "place-content",
  "place-self",
  "grid",
  "grid-template",
  "grid-template-rows",
  "grid-template-columns",
  "grid-template-areas",
  "grid-auto-rows",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-row",
  "grid-row-start",
  "grid-row-end",
  "grid-column",
  "grid-column-start",
  "grid-column-end",
  "grid-area",
  "contain",
  "content-visibility",
  "contain-intrinsic-size",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-opacity",
  "vector-effect",
  "paint-order",
  "color-interpolation",
  "color-interpolation-filters",
  "d"
]);

const DEFAULT_STYLE_VALUE_FILTERS = new Map<string, Set<string>>([
  ["animation", new Set(["none 0s ease 0s 1 normal none running"])],
  ["animation-name", new Set(["none"])],
  ["animation-duration", new Set(["0s"])],
  ["animation-delay", new Set(["0s"])],
  ["animation-iteration-count", new Set(["1"])],
  ["animation-fill-mode", new Set(["none"])],
  ["animation-play-state", new Set(["running"])],
  ["animation-timing-function", new Set(["ease"])],
  ["transition", new Set(["all 0s ease 0s"])],
  ["transition-duration", new Set(["0s"])],
  ["transition-delay", new Set(["0s"])],
  ["transition-property", new Set(["all"])],
  ["transition-timing-function", new Set(["ease"])],
  ["filter", new Set(["none"])],
  ["backdrop-filter", new Set(["none"])],
  ["transform", new Set(["none"])],
  ["translate", new Set(["none"])],
  ["rotate", new Set(["none"])],
  ["scale", new Set(["none"])],
  ["box-shadow", new Set(["none"])],
  ["text-shadow", new Set(["none"])],
  ["outline-style", new Set(["none"])],
  ["outline-width", new Set(["0px"])],
  ["outline-offset", new Set(["0px"])],
  ["text-decoration-line", new Set(["none"])],
  ["text-decoration-style", new Set(["solid"])],
  ["font-style", new Set(["normal"])],
  ["font-stretch", new Set(["100%"])],
  ["font-variant", new Set(["normal"])],
  ["letter-spacing", new Set(["normal"])],
  ["word-spacing", new Set(["0px", "normal"])],
  ["text-transform", new Set(["none"])],
  ["text-overflow", new Set(["clip"])],
  ["background-image", new Set(["none"])],
  ["background-repeat", new Set(["repeat"])],
  ["background-attachment", new Set(["scroll"])],
  ["clip-path", new Set(["none"])],
  ["mix-blend-mode", new Set(["normal"])],
  ["isolation", new Set(["auto"])],
  ["pointer-events", new Set(["auto"])],
  ["overflow", new Set(["visible"])],
  ["overflow-x", new Set(["visible"])],
  ["overflow-y", new Set(["visible"])],
  ["appearance", new Set(["none", "auto"])],
  ["background-color", new Set(["transparent", "rgba(0, 0, 0, 0)", "rgba(0,0,0,0)"])],
  ["background-position", new Set(["0% 0%"])],
  ["background-size", new Set(["auto", "auto auto"])],
  ["background-origin", new Set(["padding-box"])],
  ["background-clip", new Set(["border-box"])],
  ["object-fit", new Set(["fill"])],
  ["object-position", new Set(["50% 50%"])],
  ["place-self", new Set(["auto"])],
  ["transform-style", new Set(["flat"])],
  ["overflow-wrap", new Set(["normal"])],
  ["vertical-align", new Set(["baseline"])],
  ["cursor", new Set(["auto"])],
  ["user-select", new Set(["auto"])],
  ["word-break", new Set(["normal"])],
  ["text-align", new Set(["start"])],
  ["text-indent", new Set(["0px"])],
  ["paint-order", new Set(["normal"])],
  ["color-interpolation", new Set(["srgb"])],
  ["color-interpolation-filters", new Set(["linearrgb"])],
  ["fill-opacity", new Set(["1"])],
  ["fill-rule", new Set(["nonzero"])],
  ["stroke-dasharray", new Set(["none"])],
  ["stroke-linecap", new Set(["butt"])],
  ["stroke-linejoin", new Set(["miter"])],
  ["stroke-miterlimit", new Set(["4"])],
  ["stroke-opacity", new Set(["1"])],
  ["stroke-width", new Set(["1px"])],
  ["vector-effect", new Set(["none"])],
  ["d", new Set(["none"])]
]);
const PROTECTED_DEFAULT_STYLE_PROPERTIES = new Set<string>([
  "appearance",
  "text-decoration-line",
  "text-decoration-style",
  "font-style",
  "font-stretch",
  "font-variant",
  "letter-spacing",
  "word-spacing",
  "text-transform",
  "text-overflow",
  "text-align",
  "text-indent",
  "word-break",
  "overflow-wrap",
  "vertical-align",
  "overflow",
  "overflow-x",
  "overflow-y",
  "pointer-events",
  "user-select",
  "cursor",
  "background-color",
  "background-repeat",
  "background-attachment",
  "background-position",
  "background-size",
  "background-origin",
  "background-clip",
  "object-fit",
  "object-position",
  "fill-opacity",
  "fill-rule",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-opacity",
  "vector-effect",
  "paint-order",
  "color-interpolation",
  "color-interpolation-filters",
  "d"
]);
const NORMALIZED_DEFAULT_STYLE_VALUE_FILTERS = new Map<string, Set<string>>(
  Array.from(DEFAULT_STYLE_VALUE_FILTERS.entries(), ([property, values]) => [
    property,
    new Set(Array.from(values, (value) => normalizeStyleValue(value)))
  ])
);

(() => {
  const pickerWindow = window as PickerWindow;
  const globalKey = "__componentPickerSelectionState__";

  if (pickerWindow[globalKey]) {
    pickerWindow[globalKey]?.ui.showToast("Capture mode is already active");
    return;
  }

  const overlay = createOverlay();
  const parentOverlay = createParentOverlay();
  const ui = createPickerUi();
  const state: SelectionState = {
    overlay,
    parentOverlay,
    ui,
    lastHoveredElement: null,
    isDone: false
  };

  pickerWindow[globalKey] = state;
  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(parentOverlay);
  const teardownCaptureInteractionGuards = installCaptureInteractionGuards(() => state.isDone);

  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);

  function onMouseMove(event: MouseEvent): void {
    if (state.isDone) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    state.lastHoveredElement = target;
    updateOverlay(target.getBoundingClientRect());
    updateParentOverlayForTarget(target, event.shiftKey);
  }

  async function onClick(event: MouseEvent): Promise<void> {
    if (state.isDone) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void playSound("click.wav");

    state.isDone = true;
    cleanup();
    await waitForPostCleanupPaint();

    const selectedTarget = resolveSelectedTarget(target, event.shiftKey);
    clearDocumentSelection();
    const rect = selectedTarget.getBoundingClientRect();
    const captureBounds = clampBoundsToVisibleViewport(rect);
    const snapshot = buildStandaloneSnapshot(selectedTarget);
    const payload: SaveComponentPayload = {
      html: snapshot.html,
      cssText: snapshot.cssText,
      url: window.location.href,
      title: document.title || "",
      bounds: {
        left: captureBounds.left,
        top: captureBounds.top,
        width: captureBounds.width,
        height: captureBounds.height
      },
      devicePixelRatio: window.devicePixelRatio || 1,
      sourceHostSignature: computeLocalHostSignature(selectedTarget)
    };

    try {
      const saveRequest = sendRuntimeMessage({
        type: "SAVE_COMPONENT",
        payload
      } satisfies SaveComponentMessage);
      void playSound("jingle.wav");
      const response = (await saveRequest) as SaveComponentResponse;

      if (!response?.ok) {
        throw new Error(response?.error || "Capture failed");
      }
      state.ui.showFlash();
      if (response.previewDataUrl) {
        state.ui.showPreview(response.previewDataUrl);
      }
      state.ui.showToast("Component captured");
      state.ui.destroyAfter(4000);
    } catch (error) {
      console.error("Failed to capture component:", error);
      void playSound("error.wav");
      state.ui.showToast(getCaptureFailureMessage(error));
      state.ui.destroyAfter(2500);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      state.isDone = true;
      cleanup();
      state.ui.showToast("Capture cancelled");
      state.ui.destroyAfter(2500);
      return;
    }
    if (event.key === "Shift") {
      refreshParentOverlay(true);
      state.ui.setShiftActive(true);
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (event.key === "Shift") {
      refreshParentOverlay(false);
      state.ui.setShiftActive(false);
    }
  }

  function cleanup(): void {
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    teardownCaptureInteractionGuards();
    overlay.remove();
    parentOverlay.remove();
    state.ui.setShortcutsVisible(false);
    delete pickerWindow[globalKey];
  }

  function updateOverlay(rect: DOMRect): void {
    overlay.style.display = "block";
    overlay.style.left = `${Math.max(0, rect.left)}px`;
    overlay.style.top = `${Math.max(0, rect.top)}px`;
    overlay.style.width = `${Math.max(0, rect.width)}px`;
    overlay.style.height = `${Math.max(0, rect.height)}px`;
  }

  function updateParentOverlayForTarget(target: Element, isShiftHeld: boolean): void {
    if (!isShiftHeld) {
      parentOverlay.style.display = "none";
      return;
    }
    const parentTarget = resolveParentTarget(target);
    if (!parentTarget) {
      parentOverlay.style.display = "none";
      return;
    }
    const rect = parentTarget.getBoundingClientRect();
    parentOverlay.style.display = "block";
    parentOverlay.style.left = `${Math.max(0, rect.left)}px`;
    parentOverlay.style.top = `${Math.max(0, rect.top)}px`;
    parentOverlay.style.width = `${Math.max(0, rect.width)}px`;
    parentOverlay.style.height = `${Math.max(0, rect.height)}px`;
  }

  function refreshParentOverlay(isShiftHeld: boolean): void {
    if (!state.lastHoveredElement) {
      parentOverlay.style.display = "none";
      return;
    }
    updateParentOverlayForTarget(state.lastHoveredElement, isShiftHeld);
  }
})();

function resolveSelectedTarget(target: Element, isShiftHeld: boolean): Element {
  if (!isShiftHeld) {
    return target;
  }
  return resolveParentTarget(target) ?? target;
}

function resolveParentTarget(target: Element): Element | null {
  return target.parentElement;
}

function installCaptureInteractionGuards(isDone: () => boolean): () => void {
  const onPointerAction = (event: Event): void => {
    if (isDone()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
  const onSelectStart = (event: Event): void => {
    if (isDone()) {
      return;
    }
    event.preventDefault();
  };
  const guardEvents: Array<keyof DocumentEventMap> = [
    "mousedown",
    "mouseup",
    "dragstart",
    "contextmenu"
  ];
  for (const eventName of guardEvents) {
    document.addEventListener(eventName, onPointerAction, true);
  }
  document.addEventListener("selectstart", onSelectStart, true);
  return () => {
    for (const eventName of guardEvents) {
      document.removeEventListener(eventName, onPointerAction, true);
    }
    document.removeEventListener("selectstart", onSelectStart, true);
  };
}

function clearDocumentSelection(): void {
  window.getSelection()?.removeAllRanges();
}

function clampBoundsToVisibleViewport(rect: DOMRect): Bounds {
  const viewportLeft = 0;
  const viewportTop = 0;
  const viewportRight = window.innerWidth;
  const viewportBottom = window.innerHeight;

  const clippedLeft = Math.max(viewportLeft, rect.left);
  const clippedTop = Math.max(viewportTop, rect.top);
  const clippedRight = Math.min(viewportRight, rect.right);
  const clippedBottom = Math.min(viewportBottom, rect.bottom);

  return {
    left: clippedLeft,
    top: clippedTop,
    width: Math.max(0, clippedRight - clippedLeft),
    height: Math.max(0, clippedBottom - clippedTop)
  };
}

function buildStandaloneSnapshot(target: Element): {
  html: string;
  cssText: string;
} {
  const clonedRoot = target.cloneNode(true);
  if (!(clonedRoot instanceof Element)) {
    throw new Error("Unable to clone selected element");
  }

  const captureScopeId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `capture_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
  const captureScopeSelector = createCaptureScopeSelector(captureScopeId);
  clonedRoot.setAttribute("data-spectra-capture-root", captureScopeId);

  const originalElements = collectElementTree(target);
  const clonedElements = collectElementTree(clonedRoot);
  const pairCount = Math.min(originalElements.length, clonedElements.length);

  for (let index = 0; index < pairCount; index += 1) {
    inlineComputedStyles(originalElements[index], clonedElements[index]);
  }

  sanitizeClonedTree(clonedRoot);
  rewriteAssetUrls(clonedRoot, document.baseURI);

  const matchedScopedCssText = collectMatchedScopedCssText(target, captureScopeSelector);
  const scopedCssText = markScopedCss(matchedScopedCssText);
  const html = clonedRoot.outerHTML;
  return {
    html,
    cssText: scopedCssText
  };
}

function collectElementTree(root: Element): Element[] {
  const elements: Element[] = [root];
  elements.push(...Array.from(root.querySelectorAll("*")));
  return elements;
}

function inlineComputedStyles(originalElement: Element, clonedElement: Element): void {
  if (!(clonedElement instanceof HTMLElement) && !(clonedElement instanceof SVGElement)) {
    return;
  }
  if (INLINE_STYLE_TAG_BLOCKLIST.has(originalElement.tagName.toLowerCase())) {
    return;
  }

  const computedStyle = window.getComputedStyle(originalElement);
  for (let index = 0; index < computedStyle.length; index += 1) {
    const propertyName = computedStyle.item(index);
    if (!propertyName) {
      continue;
    }
    if (!shouldKeepCssProperty(propertyName)) {
      continue;
    }
    const value = computedStyle.getPropertyValue(propertyName);
    if (!value || shouldDropStyleValue(propertyName, value)) {
      continue;
    }
    const priority = computedStyle.getPropertyPriority(propertyName);
    clonedElement.style.setProperty(propertyName, value, priority);
  }
}

function shouldKeepCssProperty(propertyName: string): boolean {
  if (!propertyName || propertyName.startsWith("--") || propertyName.startsWith("-webkit-")) {
    return false;
  }
  return STYLE_PROPERTY_ALLOWLIST.has(propertyName);
}

function shouldDropStyleValue(propertyName: string, rawValue: string): boolean {
  const value = normalizeStyleValue(rawValue);
  if (!value) {
    return true;
  }
  if (value === "initial" || value === "inherit" || value === "unset" || value === "revert") {
    return true;
  }
  if (PROTECTED_DEFAULT_STYLE_PROPERTIES.has(propertyName)) {
    return false;
  }

  const defaults = NORMALIZED_DEFAULT_STYLE_VALUE_FILTERS.get(propertyName);
  if (!defaults) {
    return false;
  }
  return defaults.has(value);
}

function normalizeStyleValue(rawValue: string): string {
  return rawValue.trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*([,])\s*/g, "$1");
}

function computeLocalHostSignature(element: Element): SaveComponentPayload["sourceHostSignature"] {
  const computed = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const hostTag = element.tagName.toLowerCase();
  return {
    landmark: resolveLocalLandmark(element, hostTag),
    hostTag,
    layoutMode: resolveLocalLayoutMode(computed.display, computed.flexDirection),
    widthBucket: resolveLocalWidthBucket(rect.width),
    depth: resolveLocalDepth(element),
    siblingCount: element.parentElement?.children.length ?? 0,
    repeatedSiblingTag: resolveRepeatedSiblingTag(element),
    ancestorTags: resolveAncestorTags(element),
    nearbyHeading: resolveNearbyHeading(element)
  };
}

function resolveLocalLandmark(
  element: Element,
  hostTag: string
): SaveComponentPayload["sourceHostSignature"]["landmark"] {
  if (
    hostTag === "header" ||
    hostTag === "main" ||
    hostTag === "section" ||
    hostTag === "article" ||
    hostTag === "aside" ||
    hostTag === "nav" ||
    hostTag === "footer" ||
    hostTag === "form"
  ) {
    return hostTag;
  }
  if (hostTag === "div") {
    const role = element.getAttribute("role");
    if (role === "main") {
      return "main";
    }
    if (role === "navigation") {
      return "nav";
    }
  }
  if (hostTag === "div" && (element.className as string).toLowerCase?.().includes("hero")) {
    return "hero";
  }
  return "unknown";
}

function resolveLocalLayoutMode(
  display: string,
  flexDirection: string
): SaveComponentPayload["sourceHostSignature"]["layoutMode"] {
  if (display === "grid" || display === "inline-grid") {
    return "grid";
  }
  if (display === "inline") {
    return "inline";
  }
  if (display === "flex" || display === "inline-flex") {
    return flexDirection.startsWith("column") ? "flex-column" : "flex-row";
  }
  if (display === "block" || display === "flow-root" || display === "list-item") {
    return "block";
  }
  return "unknown";
}

function resolveLocalWidthBucket(width: number): SaveComponentPayload["sourceHostSignature"]["widthBucket"] {
  if (width < 320) return "xs";
  if (width < 640) return "sm";
  if (width < 960) return "md";
  if (width < 1280) return "lg";
  return "xl";
}

function resolveLocalDepth(element: Element): number {
  let depth = 0;
  let current = element.parentElement;
  while (current) {
    depth += 1;
    current = current.parentElement;
  }
  return depth;
}

function resolveRepeatedSiblingTag(element: Element): string | undefined {
  const siblings = Array.from(element.parentElement?.children ?? []);
  const counts: Record<string, number> = {};
  for (const sibling of siblings) {
    const tag = sibling.tagName.toLowerCase();
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return Object.entries(counts).find(([, count]) => count > 1)?.[0];
}

function resolveAncestorTags(element: Element): string[] {
  const tags: string[] = [];
  let current = element.parentElement;
  while (current && tags.length < 6) {
    tags.push(current.tagName.toLowerCase());
    current = current.parentElement;
  }
  return tags;
}

function resolveNearbyHeading(element: Element): string | undefined {
  const scopedHeading = element.querySelector("h1,h2,h3,h4,h5,h6");
  if (scopedHeading?.textContent) {
    return scopedHeading.textContent.trim().slice(0, 80);
  }
  const nearestSection = element.closest("section,article,main");
  const sectionHeading = nearestSection?.querySelector("h1,h2,h3,h4,h5,h6");
  return sectionHeading?.textContent?.trim().slice(0, 80) || undefined;
}

function createOverlay(): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-component-picker-overlay", "true");
  overlay.style.position = "fixed";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "2147483647";
  overlay.style.border = "2px solid #2563eb";
  overlay.style.background = "rgba(37, 99, 235, 0.12)";
  overlay.style.borderRadius = "4px";
  overlay.style.boxSizing = "border-box";
  overlay.style.transition = "all 0.03s linear";
  overlay.style.display = "none";
  return overlay;
}

function createParentOverlay(): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-component-picker-parent-overlay", "true");
  overlay.style.position = "fixed";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "2147483646";
  overlay.style.border = "2px solid #d946ef";
  overlay.style.background = "rgba(217, 70, 239, 0.1)";
  overlay.style.borderRadius = "4px";
  overlay.style.boxSizing = "border-box";
  overlay.style.transition = "all 0.03s linear";
  overlay.style.display = "none";
  return overlay;
}

async function playSound(fileName: "click.wav" | "jingle.wav" | "error.wav"): Promise<void> {
  const runtime = globalThis.chrome?.runtime;
  if (!runtime || typeof runtime.getURL !== "function") {
    return;
  }

  try {
    const audio = new Audio(runtime.getURL(`audio/${fileName}`));
    audio.volume = 0.5;
    await audio.play();
  } catch {
    // Ignore blocked autoplay and missing codec failures.
  }
}

async function sendRuntimeMessage(message: SaveComponentMessage): Promise<unknown> {
  const runtime = globalThis.chrome?.runtime;
  if (!runtime || typeof runtime.sendMessage !== "function") {
    throw new Error("Extension runtime unavailable");
  }
  return runtime.sendMessage(message);
}

async function waitForPostCleanupPaint(): Promise<void> {
  if (typeof window.requestAnimationFrame !== "function") {
    await waitForDelay(FRAME_WAIT_TIMEOUT_MS);
    return;
  }

  await waitForAnimationFrameWithTimeout();
  await waitForAnimationFrameWithTimeout();
}

function waitForAnimationFrameWithTimeout(): Promise<void> {
  return new Promise((resolve) => {
    let isSettled = false;
    const settle = (): void => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      resolve();
    };

    const timeoutId = window.setTimeout(() => {
      settle();
    }, FRAME_WAIT_TIMEOUT_MS);

    window.requestAnimationFrame(() => {
      window.clearTimeout(timeoutId);
      settle();
    });
  });
}

function waitForDelay(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}
})();
