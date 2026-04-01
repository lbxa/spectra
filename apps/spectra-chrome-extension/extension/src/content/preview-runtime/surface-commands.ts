import type { SavedComponent, SavedPreviewListItem } from "../../lib/library/types";
import type { CandidateContainer } from "../candidate-scan";
import type { PreviewRuntimeDiagnostic } from "./surface-model";

export type PreviewSurfaceCommand =
  | { type: "BEGIN_TARGETING"; component: SavedComponent }
  | {
      type: "SET_TARGETING_CANDIDATES";
      candidates: CandidateContainer[];
      activeCandidate: CandidateContainer | null;
    }
  | { type: "SET_ACTIVE_CANDIDATE"; candidate: CandidateContainer | null }
  | { type: "SET_ACTIVE_PREVIEW"; previewId: string | null }
  | { type: "SET_SAVED_PREVIEWS"; previews: SavedPreviewListItem[] }
  | { type: "SYNC_INSERTED"; insertedCount: number; activePreviewId: string | null; preserveTargeting?: boolean }
  | { type: "RESET_TO_IDLE" }
  | { type: "SET_ERROR_MODE"; message: string }
  | { type: "ADD_DIAGNOSTIC"; diagnostic: PreviewRuntimeDiagnostic }
  | { type: "CLEAR_DIAGNOSTICS" };
