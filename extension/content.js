"use strict";
(() => {
    const STYLE_PROPERTY_ALLOWLIST = new Set([
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
    const DEFAULT_STYLE_VALUE_FILTERS = new Map([
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
        const pickerWindow = window;
        const globalKey = "__componentPickerSelectionState__";
        if (pickerWindow[globalKey]) {
            showToast("Capture mode is already active.");
            return;
        }
        const overlay = createOverlay();
        const state = {
            overlay,
            isDone: false
        };
        pickerWindow[globalKey] = state;
        document.documentElement.appendChild(overlay);
        document.addEventListener("mousemove", onMouseMove, true);
        document.addEventListener("click", onClick, true);
        document.addEventListener("keydown", onKeyDown, true);
        function onMouseMove(event) {
            if (state.isDone) {
                return;
            }
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }
            updateOverlay(target.getBoundingClientRect());
        }
        async function onClick(event) {
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
            state.isDone = true;
            cleanup();
            const rect = target.getBoundingClientRect();
            const snapshotHtml = buildStandaloneSnapshotHtml(target);
            const payload = {
                html: snapshotHtml,
                url: window.location.href,
                title: document.title || "",
                bounds: {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height
                },
                devicePixelRatio: window.devicePixelRatio || 1
            };
            try {
                const response = (await chrome.runtime.sendMessage({
                    type: "SAVE_COMPONENT",
                    payload
                }));
                if (!response?.ok) {
                    throw new Error(response?.error || "Capture failed.");
                }
                showToast("Component captured.");
            }
            catch (error) {
                console.error("Failed to capture component:", error);
                showToast(getCaptureFailureMessage(error));
            }
        }
        function onKeyDown(event) {
            if (event.key !== "Escape") {
                return;
            }
            state.isDone = true;
            cleanup();
            showToast("Capture cancelled.");
        }
        function cleanup() {
            document.removeEventListener("mousemove", onMouseMove, true);
            document.removeEventListener("click", onClick, true);
            document.removeEventListener("keydown", onKeyDown, true);
            overlay.remove();
            delete pickerWindow[globalKey];
        }
        function updateOverlay(rect) {
            overlay.style.display = "block";
            overlay.style.left = `${Math.max(0, rect.left)}px`;
            overlay.style.top = `${Math.max(0, rect.top)}px`;
            overlay.style.width = `${Math.max(0, rect.width)}px`;
            overlay.style.height = `${Math.max(0, rect.height)}px`;
        }
    })();
    function buildStandaloneSnapshotHtml(target) {
        const clonedRoot = target.cloneNode(true);
        if (!(clonedRoot instanceof Element)) {
            throw new Error("Unable to clone selected element.");
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
    function collectElementTree(root) {
        const elements = [root];
        elements.push(...Array.from(root.querySelectorAll("*")));
        return elements;
    }
    function inlineComputedStyles(originalElement, clonedElement) {
        if (!(clonedElement instanceof HTMLElement) && !(clonedElement instanceof SVGElement)) {
            return;
        }
        const computedStyle = window.getComputedStyle(originalElement);
        for (const propertyName of computedStyle) {
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
    function shouldKeepCssProperty(propertyName) {
        if (!propertyName || propertyName.startsWith("--") || propertyName.startsWith("-webkit-")) {
            return false;
        }
        return STYLE_PROPERTY_ALLOWLIST.has(propertyName);
    }
    function shouldDropStyleValue(propertyName, rawValue) {
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
    function sanitizeClonedTree(root) {
        for (const scriptElement of Array.from(root.querySelectorAll("script"))) {
            scriptElement.remove();
        }
        const elements = collectElementTree(root);
        for (const element of elements) {
            for (const attribute of Array.from(element.attributes)) {
                const attributeName = attribute.name.toLowerCase();
                const attributeValue = attribute.value.trim();
                if (attributeName.startsWith("on")) {
                    element.removeAttribute(attribute.name);
                    continue;
                }
                if (attributeName.startsWith("data-")) {
                    element.removeAttribute(attribute.name);
                    continue;
                }
                if (attributeName === "class") {
                    element.removeAttribute(attribute.name);
                    continue;
                }
                if (attributeName === "style" && attributeValue.length === 0) {
                    element.removeAttribute(attribute.name);
                }
            }
        }
    }
    function rewriteAssetUrls(root, baseUrl) {
        for (const element of collectElementTree(root)) {
            rewriteAttributeToAbsoluteUrl(element, "src", baseUrl);
            rewriteAttributeToAbsoluteUrl(element, "href", baseUrl);
            rewriteAttributeToAbsoluteUrl(element, "poster", baseUrl);
            rewriteSrcSetToAbsoluteUrls(element, "srcset", baseUrl);
        }
    }
    function rewriteAttributeToAbsoluteUrl(element, attributeName, baseUrl) {
        if (!element.hasAttribute(attributeName)) {
            return;
        }
        const rawValue = element.getAttribute(attributeName);
        if (typeof rawValue !== "string" || rawValue.trim() === "") {
            return;
        }
        const absoluteValue = toAbsoluteUrl(rawValue, baseUrl);
        if (absoluteValue) {
            element.setAttribute(attributeName, absoluteValue);
        }
    }
    function rewriteSrcSetToAbsoluteUrls(element, attributeName, baseUrl) {
        if (!element.hasAttribute(attributeName)) {
            return;
        }
        const rawValue = element.getAttribute(attributeName);
        if (typeof rawValue !== "string" || rawValue.trim() === "") {
            return;
        }
        const rewrittenValue = rawValue
            .split(",")
            .map((candidate) => {
            const trimmedCandidate = candidate.trim();
            if (!trimmedCandidate) {
                return "";
            }
            const firstSpaceIndex = trimmedCandidate.search(/\s/);
            if (firstSpaceIndex === -1) {
                return toAbsoluteUrl(trimmedCandidate, baseUrl) || trimmedCandidate;
            }
            const urlPart = trimmedCandidate.slice(0, firstSpaceIndex);
            const descriptorPart = trimmedCandidate.slice(firstSpaceIndex).trim();
            const absoluteUrl = toAbsoluteUrl(urlPart, baseUrl) || urlPart;
            return descriptorPart ? `${absoluteUrl} ${descriptorPart}` : absoluteUrl;
        })
            .filter((candidate) => candidate.length > 0)
            .join(", ");
        if (rewrittenValue) {
            element.setAttribute(attributeName, rewrittenValue);
        }
    }
    function toAbsoluteUrl(value, baseUrl) {
        const trimmedValue = value.trim();
        if (!trimmedValue || trimmedValue.startsWith("#")) {
            return null;
        }
        try {
            return new URL(trimmedValue, baseUrl).toString();
        }
        catch {
            return null;
        }
    }
    function createOverlay() {
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
    function showToast(message) {
        const existing = document.querySelector("[data-component-picker-toast='true']");
        if (existing instanceof HTMLElement) {
            existing.remove();
        }
        const toast = document.createElement("div");
        toast.setAttribute("data-component-picker-toast", "true");
        toast.textContent = message;
        toast.style.position = "fixed";
        toast.style.right = "16px";
        toast.style.top = "16px";
        toast.style.zIndex = "2147483647";
        toast.style.background = "rgba(17, 24, 39, 0.92)";
        toast.style.color = "#f9fafb";
        toast.style.padding = "8px 12px";
        toast.style.borderRadius = "8px";
        toast.style.font = "12px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
        toast.style.pointerEvents = "none";
        toast.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.25)";
        document.documentElement.appendChild(toast);
        window.setTimeout(() => toast.remove(), 1400);
    }
    function getCaptureFailureMessage(error) {
        if (error instanceof Error && error.message.includes("too large to save")) {
            return "Snapshot too large. Select a smaller element.";
        }
        return "Capture failed.";
    }
})();
