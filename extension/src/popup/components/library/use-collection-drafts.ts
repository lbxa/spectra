import type { Collection } from "@/lib/library/types";
import { useEffect, useMemo, useRef, useState } from "react";

type CollectionDraft = {
  name: string;
  description: string;
  isDirty: boolean;
  isEditing: boolean;
};

const COLLECTION_DRAFT_SAVE_DEBOUNCE_MS = 300;

export function useCollectionDrafts(input: {
  collections: Collection[];
  onUpdateCollection: (
    collectionId: string,
    patch: Partial<Pick<Collection, "name" | "description">>
  ) => Promise<void>;
}): {
  draftsById: Record<string, CollectionDraft>;
  pendingRenameCollectionId: string | null;
  setPendingRenameCollectionId: (collectionId: string | null) => void;
  onChangeName: (collection: Collection, name: string) => void;
  onChangeDescription: (collection: Collection, description: string) => void;
  onFocusDraft: (collectionId: string) => void;
  onBlurDraft: (collectionId: string) => Promise<void>;
} {
  const [draftsById, setDraftsById] = useState<Record<string, CollectionDraft>>({});
  const [pendingRenameCollectionId, setPendingRenameCollectionId] = useState<string | null>(null);
  const saveTimeoutByIdRef = useRef<Record<string, number>>({});
  const draftsByIdRef = useRef<Record<string, CollectionDraft>>({});
  const collectionsRef = useRef<Collection[]>(input.collections);

  const normalizedCollections = useMemo(
    () =>
      input.collections.map((collection) => ({
        ...collection,
        name: collection.name,
        description: collection.description
      })),
    [input.collections]
  );

  useEffect(() => {
    setDraftsById((current) => {
      const nextDrafts: Record<string, CollectionDraft> = {};
      for (const collection of normalizedCollections) {
        const existing = current[collection.id];
        if (existing && (existing.isDirty || existing.isEditing)) {
          nextDrafts[collection.id] = existing;
          continue;
        }
        nextDrafts[collection.id] = {
          name: collection.name,
          description: collection.description,
          isDirty: false,
          isEditing: false
        };
      }
      return nextDrafts;
    });
  }, [normalizedCollections]);

  useEffect(() => {
    draftsByIdRef.current = draftsById;
  }, [draftsById]);

  useEffect(() => {
    collectionsRef.current = input.collections;
  }, [input.collections]);

  useEffect(() => {
    return () => {
      for (const timeoutId of Object.values(saveTimeoutByIdRef.current)) {
        window.clearTimeout(timeoutId);
      }
      saveTimeoutByIdRef.current = {};
    };
  }, []);

  const clearScheduledSave = (collectionId: string): void => {
    const existingTimeout = saveTimeoutByIdRef.current[collectionId];
    if (typeof existingTimeout === "number") {
      window.clearTimeout(existingTimeout);
      delete saveTimeoutByIdRef.current[collectionId];
    }
  };

  const flushSave = async (collectionId: string): Promise<void> => {
    clearScheduledSave(collectionId);

    const draft = draftsByIdRef.current[collectionId];
    const source = collectionsRef.current.find((collection) => collection.id === collectionId);
    if (!draft || !source) {
      return;
    }

    const nextName = draft.name.trim();
    const nextDescription = draft.description.trim();
    if (nextName === source.name && nextDescription === source.description) {
      setDraftsById((current) => {
        const existing = current[collectionId];
        if (!existing) {
          return current;
        }
        return {
          ...current,
          [collectionId]: {
            name: source.name,
            description: source.description,
            isDirty: false,
            isEditing: existing.isEditing
          }
        };
      });
      return;
    }

    await input.onUpdateCollection(collectionId, {
      name: nextName,
      description: nextDescription
    });

    setDraftsById((current) => {
      const existing = current[collectionId];
      if (!existing) {
        return current;
      }
      return {
        ...current,
        [collectionId]: {
          name: nextName,
          description: nextDescription,
          isDirty: false,
          isEditing: existing.isEditing
        }
      };
    });
  };

  const scheduleSave = (collectionId: string): void => {
    clearScheduledSave(collectionId);
    saveTimeoutByIdRef.current[collectionId] = window.setTimeout(() => {
      void flushSave(collectionId);
    }, COLLECTION_DRAFT_SAVE_DEBOUNCE_MS);
  };

  const onChangeName = (collection: Collection, name: string): void => {
    setDraftsById((current) => ({
      ...current,
      [collection.id]: {
        ...(current[collection.id] ?? {
          name: collection.name,
          description: collection.description,
          isDirty: false,
          isEditing: false
        }),
        name,
        isDirty: true
      }
    }));
    scheduleSave(collection.id);
  };

  const onChangeDescription = (collection: Collection, description: string): void => {
    setDraftsById((current) => ({
      ...current,
      [collection.id]: {
        ...(current[collection.id] ?? {
          name: collection.name,
          description: collection.description,
          isDirty: false,
          isEditing: false
        }),
        description,
        isDirty: true
      }
    }));
    scheduleSave(collection.id);
  };

  const onFocusDraft = (collectionId: string): void => {
    setDraftsById((current) => {
      const existing = current[collectionId];
      if (!existing || existing.isEditing) {
        return current;
      }
      return {
        ...current,
        [collectionId]: {
          ...existing,
          isEditing: true
        }
      };
    });
  };

  const onBlurDraft = async (collectionId: string): Promise<void> => {
    setDraftsById((current) => {
      const existing = current[collectionId];
      if (!existing || !existing.isEditing) {
        return current;
      }
      return {
        ...current,
        [collectionId]: {
          ...existing,
          isEditing: false
        }
      };
    });
    await flushSave(collectionId);
  };

  return {
    draftsById,
    pendingRenameCollectionId,
    setPendingRenameCollectionId,
    onChangeName,
    onChangeDescription,
    onFocusDraft,
    onBlurDraft
  };
}
