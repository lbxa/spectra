export type PreviewMutationWatcher = {
  stop: () => void;
};

export function watchPreviewRemoval(
  previewId: string,
  onRemoved: () => void
): PreviewMutationWatcher {
  const observer = new MutationObserver(() => {
    const existing = document.querySelector(`[data-spectra-preview-id="${previewId}"]`);
    if (!existing) {
      onRemoved();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  return {
    stop() {
      observer.disconnect();
    }
  };
}
