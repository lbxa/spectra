import type { AdaptationPatch, ComponentPack } from "../../lib/adaptation/types";

const MAX_OVERRIDE_CSS_BYTES = 16_000;
const FORBIDDEN_CSS_PATTERNS = ["<script", "javascript:", "@import", "url(http", "url(https"];
const ALLOWED_ATTRIBUTE_NAMES = new Set(["class", "style", "aria-label", "aria-hidden", "data-variant", "data-size"]);

export type AdaptationPatchValidationResult =
  | { ok: true }
  | {
    ok: false;
    reason: string;
  };

export function validateAdaptationPatch(
  patch: AdaptationPatch,
  componentPack: ComponentPack
): AdaptationPatchValidationResult {
  if (patch.strategy !== "css_override") {
    return { ok: false, reason: "Unsupported adaptation strategy" };
  }
  if (!patch.summary.trim()) {
    return { ok: false, reason: "Missing adaptation summary" };
  }
  if (patch.confidence < 0 || patch.confidence > 1 || Number.isNaN(patch.confidence)) {
    return { ok: false, reason: "Invalid adaptation confidence" };
  }

  const cssBytes = new TextEncoder().encode(patch.overrideCss || "").length;
  if (cssBytes > MAX_OVERRIDE_CSS_BYTES) {
    return { ok: false, reason: "Adaptation CSS exceeded byte limits" };
  }
  const lowerCss = patch.overrideCss.toLowerCase();
  for (const pattern of FORBIDDEN_CSS_PATTERNS) {
    if (lowerCss.includes(pattern)) {
      return { ok: false, reason: "Adaptation CSS contains forbidden content" };
    }
  }
  if (!isScopedOverrideCss(patch.overrideCss, componentPack.wrapperRootId)) {
    return { ok: false, reason: "Adaptation CSS is not scoped to preview wrapper" };
  }

  const stableNodeSet = new Set(componentPack.stableNodeIds);
  for (const edit of patch.attributeEdits) {
    if (!stableNodeSet.has(edit.nodeId)) {
      return { ok: false, reason: `Unknown node id in attribute edit: ${edit.nodeId}` };
    }
    if (!ALLOWED_ATTRIBUTE_NAMES.has(edit.name)) {
      return { ok: false, reason: `Attribute edit not allowed: ${edit.name}` };
    }
    const normalizedValue = edit.value.toLowerCase();
    if (
      normalizedValue.includes("javascript:") ||
      normalizedValue.includes("<script") ||
      normalizedValue.includes("url(http") ||
      normalizedValue.includes("url(https")
    ) {
      return { ok: false, reason: "Attribute edit contains forbidden content" };
    }
  }

  const preservedNodeSet = new Set(patch.preservedNodeIds);
  for (const requiredProtectedNodeId of componentPack.protectedNodeIds) {
    if (!preservedNodeSet.has(requiredProtectedNodeId)) {
      return { ok: false, reason: "Protected nodes are not preserved in adaptation patch" };
    }
  }

  return { ok: true };
}

function isScopedOverrideCss(overrideCss: string, wrapperRootId: string): boolean {
  const trimmed = overrideCss.trim();
  if (!trimmed) {
    return true;
  }
  const requiredScopeToken = `#${wrapperRootId}`;
  const ruleBlocks = trimmed
    .split("}")
    .map((block) => block.trim())
    .filter(Boolean);
  for (const block of ruleBlocks) {
    if (block.startsWith("@")) {
      continue;
    }
    const selector = block.split("{")[0]?.trim() ?? "";
    if (!selector.includes(requiredScopeToken)) {
      return false;
    }
  }
  return true;
}
