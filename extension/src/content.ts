import { getCaptureFailureMessage } from "./content/capture-runtime-bridge";
import { rewriteAssetUrls, sanitizeClonedTree } from "./content/capture-snapshot";

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
  shortcutsPanel: HTMLDivElement;
  shiftShortcutKey: HTMLSpanElement;
  lastHoveredElement: Element | null;
  isDone: boolean;
};

type PickerWindow = Window & {
  __componentPickerSelectionState__?: SelectionState;
};

const FRAME_WAIT_TIMEOUT_MS = 120;
const TOAST_TRANSITION_MS = 220;
const TOAST_VISIBLE_MS = 1400;
const CAPTURE_FLASH_TRANSITION_MS = 250;
const CAPTURE_PREVIEW_ENTER_MS = 320;
const CAPTURE_PREVIEW_HOLD_MS = 2500;

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
  ["d", new Set(["none"])]
]);

(() => {
  const pickerWindow = window as PickerWindow;
  const globalKey = "__componentPickerSelectionState__";

  if (pickerWindow[globalKey]) {
    showToast("Capture mode is already active");
    return;
  }

  const overlay = createOverlay();
  const parentOverlay = createParentOverlay();
  const { panel: shortcutsPanel, shiftShortcutKey } = createShortcutsPanel();
  const state: SelectionState = {
    overlay,
    parentOverlay,
    shortcutsPanel,
    shiftShortcutKey,
    lastHoveredElement: null,
    isDone: false
  };

  pickerWindow[globalKey] = state;
  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(parentOverlay);
  document.documentElement.appendChild(shortcutsPanel);

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
    const rect = selectedTarget.getBoundingClientRect();
    const snapshotHtml = buildStandaloneSnapshotHtml(selectedTarget);
    const payload: SaveComponentPayload = {
      html: snapshotHtml,
      cssText: collectDocumentCssText(),
      url: window.location.href,
      title: document.title || "",
      bounds: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      },
      devicePixelRatio: window.devicePixelRatio || 1,
      sourceHostSignature: computeLocalHostSignature(selectedTarget)
    };

    try {
      const response = (await sendRuntimeMessage({
        type: "SAVE_COMPONENT",
        payload
      } satisfies SaveComponentMessage)) as SaveComponentResponse;

      if (!response?.ok) {
        throw new Error(response?.error || "Capture failed");
      }
      playCaptureFlash();
      if (response.previewDataUrl) {
        showCapturePreview(response.previewDataUrl);
      }
      void playSound("jingle.wav");
      showToast("Component captured");
    } catch (error) {
      console.error("Failed to capture component:", error);
      void playSound("error.wav");
      showToast(getCaptureFailureMessage(error));
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      state.isDone = true;
      cleanup();
      showToast("Capture cancelled");
      return;
    }
    if (event.key === "Shift") {
      refreshParentOverlay(true);
      setShiftShortcutActive(shiftShortcutKey, true);
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (event.key === "Shift") {
      refreshParentOverlay(false);
      setShiftShortcutActive(shiftShortcutKey, false);
    }
  }

  function cleanup(): void {
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    overlay.remove();
    parentOverlay.remove();
    shortcutsPanel.remove();
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

function buildStandaloneSnapshotHtml(target: Element): string {
  const clonedRoot = target.cloneNode(true);
  if (!(clonedRoot instanceof Element)) {
    throw new Error("Unable to clone selected element");
  }

  const originalElements = collectElementTree(target);
  const clonedElements = collectElementTree(clonedRoot);
  const pairCount = Math.min(originalElements.length, clonedElements.length);

  for (let index = 0; index < pairCount; index += 1) {
    inlineComputedStyles(originalElements[index], clonedElements[index]);
  }

  sanitizeClonedTree(clonedRoot);
  rewriteAssetUrls(clonedRoot, document.baseURI);

  return clonedRoot.outerHTML;
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
  const value = rawValue.trim().toLowerCase();
  if (!value) {
    return true;
  }
  if (value === "initial" || value === "inherit" || value === "unset" || value === "revert") {
    return true;
  }

  const defaults = DEFAULT_STYLE_VALUE_FILTERS.get(propertyName);
  if (!defaults) {
    return false;
  }
  return defaults.has(value);
}

function collectDocumentCssText(): string {
  let cssText = "";
  for (const styleSheet of Array.from(document.styleSheets)) {
    try {
      const rules = styleSheet.cssRules;
      for (const rule of Array.from(rules)) {
        cssText += `${rule.cssText}\n`;
      }
    } catch {
      // Ignore cross-origin stylesheets blocked by the browser.
    }
  }
  return cssText;
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

function createShortcutsPanel(): { panel: HTMLDivElement; shiftShortcutKey: HTMLSpanElement } {
  const panel = document.createElement("div");
  panel.setAttribute("data-component-picker-shortcuts", "true");
  panel.style.position = "fixed";
  panel.style.right = "12px";
  panel.style.bottom = "12px";
  panel.style.display = "grid";
  panel.style.gap = "6px";
  panel.style.padding = "10px 12px";
  panel.style.borderRadius = "10px";
  panel.style.border = "1px solid rgba(148, 163, 184, 0.28)";
  panel.style.background = "rgba(17, 24, 39, 0.94)";
  panel.style.color = "#f8fafc";
  panel.style.font = "12px/1.35 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  panel.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.25)";
  panel.style.zIndex = "2147483647";
  panel.style.pointerEvents = "none";
  panel.style.userSelect = "none";

  const title = document.createElement("div");
  title.textContent = "Keyboard shortcuts";
  title.style.fontSize = "11px";
  title.style.fontWeight = "600";
  title.style.letterSpacing = "0.02em";
  title.style.opacity = "0.9";

  const shortcutsGrid = document.createElement("div");
  shortcutsGrid.style.display = "grid";
  shortcutsGrid.style.gridTemplateColumns = "max-content 1fr";
  shortcutsGrid.style.columnGap = "8px";
  shortcutsGrid.style.rowGap = "6px";
  shortcutsGrid.style.alignItems = "center";

  const escapeRow = createShortcutRow("Esc", "Exit capture");
  const shiftRow = createShortcutRow("Shift", "Select parent");
  const shiftShortcutKey = shiftRow.key;

  shortcutsGrid.append(escapeRow.key, escapeRow.label, shiftRow.key, shiftRow.label);
  panel.append(title, shortcutsGrid);
  return { panel, shiftShortcutKey };
}

function createShortcutRow(
  keyLabel: string,
  description: string
): { key: HTMLSpanElement; label: HTMLSpanElement } {
  const key = document.createElement("span");
  key.textContent = keyLabel;
  key.style.padding = "2px 7px";
  key.style.borderRadius = "6px";
  key.style.border = "1px solid rgba(148, 163, 184, 0.4)";
  key.style.background = "rgba(51, 65, 85, 0.35)";
  key.style.fontSize = "11px";
  key.style.fontWeight = "600";
  key.style.color = "#e2e8f0";
  key.style.transition = "border-color 120ms ease, color 120ms ease, background 120ms ease";

  const label = document.createElement("span");
  label.textContent = description;
  label.style.fontSize = "11px";
  label.style.opacity = "0.9";

  return { key, label };
}

function setShiftShortcutActive(shiftShortcutKey: HTMLSpanElement, isActive: boolean): void {
  if (isActive) {
    shiftShortcutKey.style.borderColor = "rgba(217, 70, 239, 0.9)";
    shiftShortcutKey.style.background = "rgba(217, 70, 239, 0.22)";
    shiftShortcutKey.style.color = "#f5d0fe";
    return;
  }
  shiftShortcutKey.style.borderColor = "rgba(148, 163, 184, 0.4)";
  shiftShortcutKey.style.background = "rgba(51, 65, 85, 0.35)";
  shiftShortcutKey.style.color = "#e2e8f0";
}

function showToast(message: string): void {
  const existing = document.querySelector("[data-component-picker-toast='true']");
  if (existing instanceof HTMLElement) {
    existing.remove();
  }

  const toast = document.createElement("div");
  toast.setAttribute("data-component-picker-toast", "true");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.left = "50%";
  toast.style.top = "16px";
  toast.style.transform = "translateX(-50%) translateY(-14px)";
  toast.style.opacity = "0";
  toast.style.transition = `transform ${TOAST_TRANSITION_MS}ms ease, opacity ${TOAST_TRANSITION_MS}ms ease`;
  toast.style.zIndex = "2147483647";
  toast.style.background = "rgba(17, 24, 39, 0.92)";
  toast.style.color = "#f9fafb";
  toast.style.padding = "8px 12px";
  toast.style.borderRadius = "8px";
  toast.style.whiteSpace = "nowrap";
  toast.style.maxWidth = "calc(100vw - 24px)";
  toast.style.textOverflow = "ellipsis";
  toast.style.overflow = "hidden";
  toast.style.font = "12px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  toast.style.pointerEvents = "none";
  toast.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.25)";
  document.documentElement.appendChild(toast);
  window.requestAnimationFrame(() => {
    toast.style.transform = "translateX(-50%) translateY(0)";
    toast.style.opacity = "1";
  });

  window.setTimeout(() => {
    if (!toast.isConnected) {
      return;
    }
    toast.style.transform = "translateX(-50%) translateY(-10px)";
    toast.style.opacity = "0";
    window.setTimeout(() => {
      toast.remove();
    }, TOAST_TRANSITION_MS);
  }, TOAST_VISIBLE_MS);
}

function playCaptureFlash(): void {
  const flash = document.createElement("div");
  flash.setAttribute("data-component-picker-flash", "true");
  flash.style.position = "fixed";
  flash.style.inset = "0";
  flash.style.pointerEvents = "none";
  flash.style.zIndex = "2147483647";
  flash.style.background = "#fff";
  flash.style.opacity = "0.82";
  flash.style.transition = `opacity ${CAPTURE_FLASH_TRANSITION_MS}ms ease-out`;
  document.documentElement.appendChild(flash);

  window.requestAnimationFrame(() => {
    flash.style.opacity = "0";
  });

  const removeFlash = (): void => {
    flash.removeEventListener("transitionend", removeFlash);
    flash.remove();
  };
  flash.addEventListener("transitionend", removeFlash, { once: true });
  window.setTimeout(removeFlash, CAPTURE_FLASH_TRANSITION_MS + 100);
}

function showCapturePreview(dataUrl: string): void {
  const existing = document.querySelector("[data-component-picker-capture-preview='true']");
  if (existing instanceof HTMLElement) {
    existing.remove();
  }

  const preview = document.createElement("img");
  preview.setAttribute("data-component-picker-capture-preview", "true");
  preview.src = dataUrl;
  preview.alt = "Captured screenshot preview";
  preview.style.position = "fixed";
  preview.style.top = "16px";
  preview.style.right = "16px";
  preview.style.width = "120px";
  preview.style.height = "auto";
  preview.style.maxHeight = "120px";
  preview.style.objectFit = "cover";
  preview.style.borderRadius = "10px";
  preview.style.border = "1px solid rgba(148, 163, 184, 0.35)";
  preview.style.boxShadow = "0 14px 28px rgba(0, 0, 0, 0.28)";
  preview.style.background = "rgba(15, 23, 42, 0.8)";
  preview.style.pointerEvents = "none";
  preview.style.zIndex = "2147483647";
  preview.style.opacity = "0";
  preview.style.transform = "translateX(calc(100% + 20px))";
  preview.style.transition = `transform ${CAPTURE_PREVIEW_ENTER_MS}ms ease, opacity ${CAPTURE_PREVIEW_ENTER_MS}ms ease`;

  document.documentElement.appendChild(preview);
  window.requestAnimationFrame(() => {
    preview.style.transform = "translateX(0)";
    preview.style.opacity = "1";
  });

  window.setTimeout(() => {
    if (!preview.isConnected) {
      return;
    }
    preview.style.transform = "translateX(calc(100% + 20px))";
    preview.style.opacity = "0";
    window.setTimeout(() => {
      preview.remove();
    }, CAPTURE_PREVIEW_ENTER_MS);
  }, CAPTURE_PREVIEW_HOLD_MS);
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
