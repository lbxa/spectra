import type { PreviewSurfaceCommand } from "./surface-commands";
import type { PreviewSurfaceState } from "./surface-model";
import { getModeKind } from "./surface-model";

const MAX_DIAGNOSTICS = 20;

export function reducePreviewSurfaceState(
  state: PreviewSurfaceState,
  command: PreviewSurfaceCommand
): PreviewSurfaceState {
  switch (command.type) {
    case "BEGIN_TARGETING":
      return {
        ...state,
        mode: { kind: "targeting" },
        relation: "inside",
        alignment: "start",
        component: command.component,
        candidates: [],
        activeCandidate: null
      };

    case "SET_TARGETING_CANDIDATES":
      return {
        ...state,
        candidates: command.candidates,
        activeCandidate: command.activeCandidate
      };

    case "SET_ACTIVE_CANDIDATE":
      return {
        ...state,
        activeCandidate: command.candidate
      };

    case "SET_ACTIVE_PREVIEW":
      return {
        ...state,
        activePreviewId: command.previewId
      };

    case "SET_SAVED_PREVIEWS":
      return {
        ...state,
        savedPreviews: command.previews
      };

    case "SYNC_INSERTED": {
      const currentMode = getModeKind(state);
      const nextMode =
        command.preserveTargeting && currentMode === "targeting"
          ? { kind: "targeting" as const }
          : command.insertedCount > 0
            ? { kind: "inserted" as const }
            : { kind: "idle" as const };
      return {
        ...state,
        mode: nextMode,
        activePreviewId: command.activePreviewId
      };
    }

    case "RESET_TO_IDLE":
      return {
        ...state,
        mode: { kind: "idle" },
        candidates: [],
        activeCandidate: null
      };

    case "SET_ERROR_MODE":
      return {
        ...state,
        mode: { kind: "error", message: command.message }
      };

    case "ADD_DIAGNOSTIC":
      return {
        ...state,
        diagnostics: [...state.diagnostics, command.diagnostic].slice(-MAX_DIAGNOSTICS)
      };

    case "CLEAR_DIAGNOSTICS":
      return {
        ...state,
        diagnostics: []
      };

    default:
      return state;
  }
}
