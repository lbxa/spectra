import type { InsertionRelation } from "../../lib/library/messages";
import type { CandidateContainer } from "../candidate-scan";
import type { OverlayRoot } from "../overlay-root";
import { hideParentOutline } from "../targeting/parent-outline";
import { showRect, updateCandidatePresentation } from "./helpers";

export function applyTargetingCandidateEffect(
  overlay: OverlayRoot,
  candidate: CandidateContainer,
  relation: InsertionRelation
): void {
  updateCandidatePresentation(candidate, overlay, relation);
}

export function clearTargetingChromeEffect(overlay: OverlayRoot): void {
  overlay.hoverOutline.style.display = "none";
  hideParentOutline(overlay.parentOutline);
  overlay.ghost.style.display = "none";
  overlay.label.style.display = "none";
}

export function clearAllChromeEffect(overlay: OverlayRoot): void {
  clearTargetingChromeEffect(overlay);
  overlay.selectedOutline.style.display = "none";
}

export function showInsertedSelectionEffect(overlay: OverlayRoot, wrapperRect: DOMRect): void {
  showRect(overlay.selectedOutline, wrapperRect);
}
