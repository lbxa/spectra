import type { SavedComponent } from "../types";
import { byDescendingDate } from "./normalizers";

export function sortComponentsByCapturedAt(components: SavedComponent[]): SavedComponent[] {
  return components.sort((left, right) => byDescendingDate(left.capturedAt, right.capturedAt));
}
