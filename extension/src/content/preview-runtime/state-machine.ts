import type { InsertionRelation, PreviewAlignment } from "../../lib/library/messages";
import type { SavedComponent, SavedPreviewListItem } from "../../lib/library/types";
import type { CandidateContainer } from "../candidate-scan";

export type PreviewMode = "idle" | "targeting" | "inserted";

export type PreviewRuntimeState = {
  mode: PreviewMode;
  relation: InsertionRelation;
  alignment: PreviewAlignment;
  component: SavedComponent | null;
  candidates: CandidateContainer[];
  activeCandidate: CandidateContainer | null;
  activePreviewId: string | null;
  savedPreviews: SavedPreviewListItem[];
};

export const initialPreviewRuntimeState: PreviewRuntimeState = {
  mode: "idle",
  relation: "inside",
  alignment: "start",
  component: null,
  candidates: [],
  activeCandidate: null,
  activePreviewId: null,
  savedPreviews: []
};

export type PreviewRuntimeAction =
  | { type: "BEGIN_TARGETING"; component: SavedComponent }
  | { type: "SET_TARGETING_CANDIDATES"; candidates: CandidateContainer[]; activeCandidate: CandidateContainer | null }
  | { type: "SET_ACTIVE_CANDIDATE"; candidate: CandidateContainer | null }
  | { type: "SET_ACTIVE_PREVIEW"; previewId: string | null }
  | { type: "SET_SAVED_PREVIEWS"; previews: SavedPreviewListItem[] }
  | { type: "SYNC_INSERTED"; insertedCount: number; activePreviewId: string | null; preserveTargeting?: boolean }
  | { type: "RESET_TO_IDLE" };

export function reducePreviewRuntimeState(
  state: PreviewRuntimeState,
  action: PreviewRuntimeAction
): PreviewRuntimeState {
  switch (action.type) {
    case "BEGIN_TARGETING":
      return {
        ...state,
        mode: "targeting",
        relation: "inside",
        alignment: "start",
        component: action.component,
        candidates: [],
        activeCandidate: null
      };

    case "SET_TARGETING_CANDIDATES":
      return {
        ...state,
        candidates: action.candidates,
        activeCandidate: action.activeCandidate
      };

    case "SET_ACTIVE_CANDIDATE":
      return {
        ...state,
        activeCandidate: action.candidate
      };

    case "SET_ACTIVE_PREVIEW":
      return {
        ...state,
        activePreviewId: action.previewId
      };

    case "SET_SAVED_PREVIEWS":
      return {
        ...state,
        savedPreviews: action.previews
      };

    case "SYNC_INSERTED": {
      const nextMode =
        action.preserveTargeting && state.mode === "targeting"
          ? "targeting"
          : action.insertedCount > 0
            ? "inserted"
            : "idle";
      return {
        ...state,
        mode: nextMode,
        activePreviewId: action.activePreviewId
      };
    }

    case "RESET_TO_IDLE":
      return {
        ...state,
        mode: "idle",
        candidates: [],
        activeCandidate: null
      };

    default:
      return state;
  }
}
