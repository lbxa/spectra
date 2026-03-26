const LIBRARY_PREFERENCES_STORAGE_KEY = "libraryPreferences";

export type LibraryPreferences = {
  selectedCollectionId: string | null;
};

export async function getLibraryPreferences(): Promise<LibraryPreferences> {
  const stored = await chrome.storage.local.get(LIBRARY_PREFERENCES_STORAGE_KEY);
  const candidate = stored[LIBRARY_PREFERENCES_STORAGE_KEY];
  if (!candidate || typeof candidate !== "object") {
    return { selectedCollectionId: null };
  }
  if (!("selectedCollectionId" in candidate)) {
    return { selectedCollectionId: null };
  }
  const selectedCollectionId = candidate.selectedCollectionId;
  if (selectedCollectionId === null || typeof selectedCollectionId === "string") {
    return { selectedCollectionId };
  }
  return { selectedCollectionId: null };
}

export async function setSelectedCollectionPreference(selectedCollectionId: string | null): Promise<void> {
  const nextPreferences: LibraryPreferences = {
    selectedCollectionId
  };
  await chrome.storage.local.set({
    [LIBRARY_PREFERENCES_STORAGE_KEY]: nextPreferences
  });
}
