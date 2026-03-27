import type { InsertionRelation } from "../lib/library/messages";

export function updateGhostPlacement(
  ghost: HTMLElement,
  hostRect: DOMRect,
  relation: InsertionRelation
): void {
  ghost.style.display = "block";
  ghost.style.left = `${Math.max(0, hostRect.left)}px`;
  ghost.style.width = `${Math.max(1, hostRect.width)}px`;

  if (relation === "inside") {
    const height = Math.min(120, Math.max(28, hostRect.height * 0.22));
    ghost.style.top = `${Math.max(0, hostRect.bottom - height)}px`;
    ghost.style.height = `${Math.max(24, height)}px`;
    return;
  }

  const lineHeight = 8;
  ghost.style.height = `${lineHeight}px`;
  ghost.style.top = relation === "before" ? `${Math.max(0, hostRect.top - lineHeight / 2)}px` : `${hostRect.bottom - lineHeight / 2}px`;
}
