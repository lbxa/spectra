import type { PreviewSurfaceCommand } from "./surface-commands";
import {
  getModeKind,
  initialPreviewSurfaceState,
  type PreviewSurfaceState
} from "./surface-model";
import { reducePreviewSurfaceState } from "./surface-reducer";

export type PreviewMode = ReturnType<typeof getModeKind>;

export type PreviewRuntimeState = PreviewSurfaceState;

export const initialPreviewRuntimeState: PreviewRuntimeState = initialPreviewSurfaceState;

export type PreviewRuntimeAction = PreviewSurfaceCommand;

export function reducePreviewRuntimeState(
  state: PreviewRuntimeState,
  action: PreviewRuntimeAction
): PreviewRuntimeState {
  return reducePreviewSurfaceState(state, action);
}

export { getModeKind } from "./surface-model";
