export const POPUP_STORAGE_KEY = "components";

export const FALLBACK_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='130'%3E%3Crect width='100%25' height='100%25' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='52%25' text-anchor='middle' font-size='12' fill='%2364758b' font-family='Arial'%3ENo screenshot%3C/text%3E%3C/svg%3E";

export type PopupSavedComponent = {
  id: string;
  url: string;
  title: string;
  capturedAt: string;
  html: string;
  screenshotDataUrl: string;
};

export type PopupStartCaptureMessage = {
  type: "START_CAPTURE";
};

export type PopupSaveComponentResponse = {
  ok: boolean;
  error?: string;
};
