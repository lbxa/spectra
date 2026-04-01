import type { InsertionRelation, PreviewAlignment } from "../../lib/library/messages";
import type { SavedComponent, SavedPreviewListItem } from "../../lib/library/types";
import type { CandidateContainer } from "../candidate-scan";

export type PreviewSurfaceMode =
  | { kind: "idle" }
  | { kind: "targeting" }
  | { kind: "inserted" }
  | { kind: "error"; message: string };

export type PreviewRuntimeDiagnosticCode =
  | "anchor_not_found"
  | "anchor_unstable"
  | "fallback_anchor_used"
  | "component_missing"
  | "partial_apply";

export type PreviewRuntimeDiagnosticSeverity = "info" | "warning" | "error";

export type PreviewRuntimeDiagnostic = {
  code: PreviewRuntimeDiagnosticCode;
  message: string;
  severity: PreviewRuntimeDiagnosticSeverity;
  createdAt: string;
};

export type PreviewSurfaceState = {
  mode: PreviewSurfaceMode;
  relation: InsertionRelation;
  alignment: PreviewAlignment;
  component: SavedComponent | null;
  candidates: CandidateContainer[];
  activeCandidate: CandidateContainer | null;
  activePreviewId: string | null;
  savedPreviews: SavedPreviewListItem[];
  diagnostics: PreviewRuntimeDiagnostic[];
};

export const initialPreviewSurfaceState: PreviewSurfaceState = {
  mode: { kind: "idle" },
  relation: "inside",
  alignment: "start",
  component: null,
  candidates: [],
  activeCandidate: null,
  activePreviewId: null,
  savedPreviews: [],
  diagnostics: []
};

export function getModeKind(state: PreviewSurfaceState): PreviewSurfaceMode["kind"] {
  return state.mode.kind;
}

export function isMode(state: PreviewSurfaceState, modeKind: PreviewSurfaceMode["kind"]): boolean {
  return state.mode.kind === modeKind;
}
