import type { AdaptationPatch, ComponentPack } from "../../lib/library/messages";

const MAX_OVERRIDE_CSS = 10_000;
const MAX_ATTRIBUTE_EDITS = 200;

export function validateAdaptationPatch(
  patch: AdaptationPatch | undefined,
  componentPack: ComponentPack
): { ok: true } | { ok: false; reason: string } {
  if (!patch) {
    return { ok: false, reason: "Missing adaptation patch" };
  }
  if (patch.strategy !== "css_override") {
    return { ok: false, reason: "Unsupported adaptation strategy" };
  }
  if (typeof patch.overrideCss !== "string" || patch.overrideCss.length > MAX_OVERRIDE_CSS) {
    return { ok: false, reason: "Override CSS exceeds allowed size" };
  }
  if (!Number.isFinite(patch.confidence) || patch.confidence < 0 || patch.confidence > 1) {
    return { ok: false, reason: "Invalid confidence value" };
  }
  if (!Array.isArray(patch.attributeEdits) || patch.attributeEdits.length > MAX_ATTRIBUTE_EDITS) {
    return { ok: false, reason: "Invalid attribute edit set" };
  }

  const knownNodeIds = new Set(componentPack.stableNodeIds);
  for (const edit of patch.attributeEdits) {
    if (!knownNodeIds.has(edit.nodeId)) {
      return { ok: false, reason: `Unknown node id: ${edit.nodeId}` };
    }
    if (!edit.name || /^on/i.test(edit.name)) {
      return { ok: false, reason: `Unsafe attribute: ${edit.name}` };
    }
  }

  return { ok: true };
}
