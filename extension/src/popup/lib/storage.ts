import { POPUP_STORAGE_KEY, type PopupSavedComponent } from "../types";

export async function getSavedComponents(): Promise<PopupSavedComponent[]> {
  const stored = await chrome.storage.local.get(POPUP_STORAGE_KEY);
  const records = Array.isArray(stored[POPUP_STORAGE_KEY]) ? (stored[POPUP_STORAGE_KEY] as unknown[]) : [];
  const validRecords = records.filter(isSavedComponentLike);

  validRecords.sort((a, b) => {
    const left = new Date(a.capturedAt).getTime();
    const right = new Date(b.capturedAt).getTime();
    return right - left;
  });

  return validRecords;
}

function isSavedComponentLike(candidate: unknown): candidate is PopupSavedComponent {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const value = candidate as Partial<PopupSavedComponent>;
  return (
    typeof value.id === "string" &&
    typeof value.html === "string" &&
    typeof value.url === "string" &&
    typeof value.title === "string" &&
    typeof value.capturedAt === "string"
  );
}
