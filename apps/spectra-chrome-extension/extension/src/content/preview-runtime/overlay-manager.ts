import type { SavedPreviewListItem } from "../../lib/library/types";
import { mountOverlayRoot, type OverlayRoot } from "../overlay-root";
import {
  createPreviewSessionToolbar,
  type PreviewSessionToolbarControls
} from "../preview-session-toolbar";
import { createShortcutsHud, type ShortcutsHudApi } from "../picker-ui/ShortcutsHud";
import { hideParentOutline } from "../targeting/parent-outline";

type OverlayManagerHandlers = {
  onSave: () => void;
  onLoadPreviews: () => void;
  onApplyPreview: (previewId: string) => void;
  onClearAll: () => void;
  onExit: () => void;
};

type OverlayToolbarState = {
  previews: SavedPreviewListItem[];
  hasInsertedPreviews: boolean;
  isBusy?: boolean;
};

export type PreviewOverlayManager = ReturnType<typeof createPreviewOverlayManager>;

export function createPreviewOverlayManager(handlers: OverlayManagerHandlers) {
  let overlay: OverlayRoot | null = null;
  let sessionToolbar: PreviewSessionToolbarControls | null = null;
  let shortcutsHud: ShortcutsHudApi | null = null;

  const ensureMounted = (): OverlayRoot => {
    if (overlay) {
      return overlay;
    }
    overlay = mountOverlayRoot();
    shortcutsHud = createShortcutsHud({ escapeDescription: "Exit preview" });
    sessionToolbar = createPreviewSessionToolbar({
      onSave: handlers.onSave,
      onLoadPreviews: handlers.onLoadPreviews,
      onApplyPreview: handlers.onApplyPreview,
      onClearAll: handlers.onClearAll,
      onExit: handlers.onExit
    });
    sessionToolbar.mount(overlay.controlsHost);
    return overlay;
  };

  return {
    ensureMounted,
    getOverlay: (): OverlayRoot | null => overlay,
    showToast(message: string): void {
      ensureMounted().showToast(message);
    },
    showFlash(): void {
      ensureMounted().showFlash();
    },
    setShortcutsVisible(visible: boolean): void {
      if (!shortcutsHud) {
        ensureMounted();
      }
      shortcutsHud?.setVisible(visible);
      if (!visible) {
        shortcutsHud?.setShiftActive(false);
      }
    },
    setShiftActive(isActive: boolean): void {
      if (!shortcutsHud) {
        ensureMounted();
      }
      shortcutsHud?.setShiftActive(isActive);
    },
    updateToolbar(state: OverlayToolbarState): void {
      if (!sessionToolbar) {
        ensureMounted();
      }
      sessionToolbar?.update({
        previews: state.previews,
        isBusy: state.isBusy ?? false
      });
      if (state.hasInsertedPreviews) {
        sessionToolbar?.show();
        return;
      }
      sessionToolbar?.hide();
    },
    clearSelectionChrome(): void {
      if (!overlay) {
        return;
      }
      overlay.hoverOutline.style.display = "none";
      hideParentOutline(overlay.parentOutline);
      overlay.selectedOutline.style.display = "none";
      overlay.ghost.style.display = "none";
      overlay.label.style.display = "none";
    },
    destroy(): void {
      sessionToolbar?.unmount();
      sessionToolbar = null;
      shortcutsHud?.destroy();
      shortcutsHud = null;
      overlay?.destroy();
      overlay = null;
    }
  };
}
