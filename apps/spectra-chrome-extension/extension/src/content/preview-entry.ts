import { createPreviewRuntime } from "./preview-runtime/controller";

type RuntimeWindow = Window & {
  __spectraPreviewRuntimeV1__?: {
    teardown: () => void;
  };
};

(() => {
  const runtimeWindow = window as RuntimeWindow;
  if (runtimeWindow.__spectraPreviewRuntimeV1__) {
    return;
  }
  runtimeWindow.__spectraPreviewRuntimeV1__ = createPreviewRuntime({
    onTeardown: () => {
      delete runtimeWindow.__spectraPreviewRuntimeV1__;
    }
  });
})();
