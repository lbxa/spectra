import {
  createPreviewSession,
  type PreviewSessionAdaptationDeps,
  type PreviewSessionMessaging
} from "./preview-session";

export type PreviewRuntime = {
  teardown: () => void;
};

type PreviewRuntimeOptions = {
  onTeardown?: () => void;
  messaging?: PreviewSessionMessaging;
  adaptation?: PreviewSessionAdaptationDeps;
};

export function createPreviewRuntime(options: PreviewRuntimeOptions = {}): PreviewRuntime {
  return createPreviewSession(options);
}
