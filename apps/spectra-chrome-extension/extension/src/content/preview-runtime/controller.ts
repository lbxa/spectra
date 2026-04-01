import { createPreviewSession } from "./preview-session";

export type PreviewRuntime = {
  teardown: () => void;
};

type PreviewRuntimeOptions = {
  onTeardown?: () => void;
};

export function createPreviewRuntime(options: PreviewRuntimeOptions = {}): PreviewRuntime {
  return createPreviewSession(options);
}
