import {
  INBOX_COLLECTION_DESCRIPTION,
  INBOX_COLLECTION_ID,
  INBOX_COLLECTION_NAME,
  LIBRARY_ID,
  type SavedPreview,
  type SavedPreviewListItem,
  type Collection,
  type LibraryMeta,
  type LibraryRepository,
  type SavedComponent
} from "./types";
import { sortCollectionsByUpdatedAt } from "./repository/collection-ops";
import { sortComponentsByCapturedAt } from "./repository/component-ops";
import { requestToPromise, waitForTransaction } from "./repository/idb-core";
import {
  createId,
  normalizeCollectionDescription,
  normalizeCollectionName,
  normalizeComponentInput,
  normalizeStoredComponent
} from "./repository/normalizers";
import { normalizePathname } from "../preview/pathname";

const DATABASE_NAME = "spectra-library-v2";
const DATABASE_VERSION = 2;

const LIBRARY_META_STORE = "libraryMeta";
const COLLECTIONS_STORE = "collections";
const COMPONENTS_STORE = "components";
const COMPONENTS_BY_COLLECTION_INDEX = "byCollectionId";
const SAVED_PREVIEWS_STORE = "savedPreviews";
const SAVED_PREVIEWS_BY_TARGET_ORIGIN_INDEX = "byTargetOrigin";
const SAVED_PREVIEWS_BY_STATUS_INDEX = "byStatus";

class IndexedDbLibraryRepository implements LibraryRepository {
  private static instance: IndexedDbLibraryRepository | null = null;

  private databasePromise: Promise<IDBDatabase> | null = null;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): IndexedDbLibraryRepository {
    if (!IndexedDbLibraryRepository.instance) {
      IndexedDbLibraryRepository.instance = new IndexedDbLibraryRepository();
    }
    return IndexedDbLibraryRepository.instance;
  }

  async getLibraryMeta(): Promise<LibraryMeta> {
    await this.initLibraryState();
    return this.readLibraryMeta();
  }

  async initLibrary(): Promise<void> {
    await this.initLibraryState();
  }

  async listCollections(): Promise<Collection[]> {
    await this.initLibraryState();
    const collections = await this.readonlyTransaction([COLLECTIONS_STORE], async (transaction) => {
      const collectionStore = transaction.objectStore(COLLECTIONS_STORE);
      return requestToPromise<Collection[]>(collectionStore.getAll());
    });
    return sortCollectionsByUpdatedAt(collections);
  }

  async getCollection(id: string): Promise<Collection | null> {
    await this.initLibraryState();
    if (!id) {
      return null;
    }

    return this.readonlyTransaction([COLLECTIONS_STORE], async (transaction) => {
      const collectionStore = transaction.objectStore(COLLECTIONS_STORE);
      const collection = await requestToPromise<Collection | undefined>(collectionStore.get(id));
      return collection ?? null;
    });
  }

  async createCollection(input: { name: string; description?: string }): Promise<Collection> {
    await this.initLibraryState();
    const now = new Date().toISOString();
    const collection: Collection = {
      id: createId(),
      name: normalizeCollectionName(input.name),
      description: normalizeCollectionDescription(input.description),
      createdAt: now,
      updatedAt: now,
      isSystem: false
    };

    await this.readwriteTransaction([COLLECTIONS_STORE, LIBRARY_META_STORE], async (transaction) => {
      const collectionStore = transaction.objectStore(COLLECTIONS_STORE);
      collectionStore.put(collection);

      const libraryMetaStore = transaction.objectStore(LIBRARY_META_STORE);
      const meta = await requestToPromise<LibraryMeta | undefined>(libraryMetaStore.get(LIBRARY_ID));
      if (!meta) {
        throw new Error("Library metadata is missing.");
      }
      const updatedMeta: LibraryMeta = {
        ...meta,
        updatedAt: now
      };
      libraryMetaStore.put(updatedMeta);
    });

    return collection;
  }

  async updateCollection(
    id: string,
    patch: Partial<Pick<Collection, "name" | "description">>
  ): Promise<Collection> {
    await this.initLibraryState();
    if (!id) {
      throw new Error("Collection id is required.");
    }

    const updatedCollection = await this.readwriteTransaction(
      [COLLECTIONS_STORE, LIBRARY_META_STORE],
      async (transaction) => {
        const collectionStore = transaction.objectStore(COLLECTIONS_STORE);
        const existing = await requestToPromise<Collection | undefined>(collectionStore.get(id));
        if (!existing) {
          throw new Error("Collection not found.");
        }

        const now = new Date().toISOString();
        const nextName = patch.name === undefined ? existing.name : normalizeCollectionName(patch.name);
        const nextDescription =
          patch.description === undefined
            ? existing.description
            : normalizeCollectionDescription(patch.description);

        const nextCollection: Collection = {
          ...existing,
          name: nextName,
          description: nextDescription,
          updatedAt: now
        };
        collectionStore.put(nextCollection);

        const libraryMetaStore = transaction.objectStore(LIBRARY_META_STORE);
        const meta = await requestToPromise<LibraryMeta | undefined>(libraryMetaStore.get(LIBRARY_ID));
        if (meta) {
          const updatedMeta: LibraryMeta = {
            ...meta,
            updatedAt: now
          };
          libraryMetaStore.put(updatedMeta);
        }

        return nextCollection;
      }
    );

    return updatedCollection;
  }

  async deleteCollection(id: string): Promise<void> {
    await this.initLibraryState();
    if (!id) {
      throw new Error("Collection id is required.");
    }
    if (id === INBOX_COLLECTION_ID) {
      throw new Error("Inbox cannot be deleted.");
    }

    await this.readwriteTransaction(
      [COLLECTIONS_STORE, COMPONENTS_STORE, LIBRARY_META_STORE],
      async (transaction) => {
        const collectionStore = transaction.objectStore(COLLECTIONS_STORE);
        const componentStore = transaction.objectStore(COMPONENTS_STORE);
        const libraryMetaStore = transaction.objectStore(LIBRARY_META_STORE);

        const collection = await requestToPromise<Collection | undefined>(collectionStore.get(id));
        if (!collection) {
          throw new Error("Collection not found.");
        }

        const byCollectionIndex = componentStore.index(COMPONENTS_BY_COLLECTION_INDEX);
        const linkedComponents = await requestToPromise<SavedComponent[]>(byCollectionIndex.getAll(id));
        const now = new Date().toISOString();

        for (const candidate of linkedComponents) {
          const component = normalizeStoredComponent(candidate, INBOX_COLLECTION_ID);
          const nextCollectionIds = Array.from(
            new Set(component.collectionIds.filter((collectionId) => collectionId !== id))
          );
          if (nextCollectionIds.length === 0) {
            componentStore.delete(component.id);
            continue;
          }
          const updatedComponent: SavedComponent = {
            ...component,
            collectionIds: nextCollectionIds
          };
          componentStore.put(updatedComponent);
        }

        collectionStore.delete(id);

        const meta = await requestToPromise<LibraryMeta | undefined>(libraryMetaStore.get(LIBRARY_ID));
        if (meta) {
          const updatedMeta: LibraryMeta = {
            ...meta,
            updatedAt: now
          };
          libraryMetaStore.put(updatedMeta);
        }
      }
    );
  }

  async listComponents(collectionId?: string): Promise<SavedComponent[]> {
    await this.initLibraryState();
    const components = await this.readonlyTransaction([COMPONENTS_STORE], async (transaction) => {
      const componentStore = transaction.objectStore(COMPONENTS_STORE);
      if (collectionId) {
        const byCollectionIndex = componentStore.index(COMPONENTS_BY_COLLECTION_INDEX);
        return requestToPromise<SavedComponent[]>(byCollectionIndex.getAll(collectionId));
      }
      return requestToPromise<SavedComponent[]>(componentStore.getAll());
    });
    return sortComponentsByCapturedAt(
      components.map((component) => normalizeStoredComponent(component, INBOX_COLLECTION_ID))
    );
  }

  async getComponent(id: string): Promise<SavedComponent | null> {
    await this.initLibraryState();
    if (!id) {
      return null;
    }

    return this.readonlyTransaction([COMPONENTS_STORE], async (transaction) => {
      const componentStore = transaction.objectStore(COMPONENTS_STORE);
      const component = await requestToPromise<SavedComponent | undefined>(componentStore.get(id));
      if (!component) {
        return null;
      }
      return normalizeStoredComponent(component, INBOX_COLLECTION_ID);
    });
  }

  async saveComponent(input: SavedComponent): Promise<SavedComponent> {
    await this.initLibraryState();

    const savedComponent = await this.readwriteTransaction(
      [COMPONENTS_STORE, COLLECTIONS_STORE, LIBRARY_META_STORE],
      async (transaction) => {
        const componentStore = transaction.objectStore(COMPONENTS_STORE);
        const collectionStore = transaction.objectStore(COLLECTIONS_STORE);
        const libraryMetaStore = transaction.objectStore(LIBRARY_META_STORE);

        const meta = await requestToPromise<LibraryMeta | undefined>(libraryMetaStore.get(LIBRARY_ID));
        if (!meta) {
          throw new Error("Library metadata is missing.");
        }

        const normalizedComponent = normalizeComponentInput(input, meta.defaultCollectionId);
        for (const collectionId of normalizedComponent.collectionIds) {
          const targetCollection = await requestToPromise<Collection | undefined>(collectionStore.get(collectionId));
          if (!targetCollection) {
            throw new Error("Target collection does not exist.");
          }
        }
        componentStore.put(normalizedComponent);

        const now = new Date().toISOString();
        for (const collectionId of normalizedComponent.collectionIds) {
          const collection = await requestToPromise<Collection | undefined>(collectionStore.get(collectionId));
          if (!collection) {
            continue;
          }
          const updatedCollection: Collection = {
            ...collection,
            updatedAt: now
          };
          collectionStore.put(updatedCollection);
        }

        const updatedMeta: LibraryMeta = {
          ...meta,
          updatedAt: now
        };
        libraryMetaStore.put(updatedMeta);

        return normalizedComponent;
      }
    );

    return savedComponent;
  }

  async copyComponentToCollection(id: string, targetCollectionId: string): Promise<SavedComponent> {
    await this.initLibraryState();
    if (!id) {
      throw new Error("Component id is required.");
    }
    if (!targetCollectionId.trim()) {
      throw new Error("Target collection id is required.");
    }

    return this.readwriteTransaction(
      [COMPONENTS_STORE, COLLECTIONS_STORE, LIBRARY_META_STORE],
      async (transaction) => {
        const componentStore = transaction.objectStore(COMPONENTS_STORE);
        const collectionStore = transaction.objectStore(COLLECTIONS_STORE);
        const libraryMetaStore = transaction.objectStore(LIBRARY_META_STORE);

        const meta = await requestToPromise<LibraryMeta | undefined>(libraryMetaStore.get(LIBRARY_ID));
        if (!meta) {
          throw new Error("Library metadata is missing.");
        }

        const existing = await requestToPromise<SavedComponent | undefined>(componentStore.get(id));
        if (!existing) {
          throw new Error("Component not found.");
        }
        const component = normalizeStoredComponent(existing, meta.defaultCollectionId);

        const targetCollection = await requestToPromise<Collection | undefined>(
          collectionStore.get(targetCollectionId)
        );
        if (!targetCollection) {
          throw new Error("Target collection does not exist.");
        }

        if (component.collectionIds.includes(targetCollectionId)) {
          return component;
        }

        const copiedComponent: SavedComponent = {
          ...component,
          id: createId(),
          collectionIds: [targetCollectionId]
        };
        componentStore.put(copiedComponent);

        const now = new Date().toISOString();
        const updatedTargetCollection: Collection = {
          ...targetCollection,
          updatedAt: now
        };
        collectionStore.put(updatedTargetCollection);

        const updatedMeta: LibraryMeta = {
          ...meta,
          updatedAt: now
        };
        libraryMetaStore.put(updatedMeta);

        return copiedComponent;
      }
    );
  }

  async moveComponentToCollection(
    id: string,
    sourceCollectionId: string,
    targetCollectionId: string
  ): Promise<SavedComponent> {
    await this.initLibraryState();
    if (!id) {
      throw new Error("Component id is required.");
    }
    if (!sourceCollectionId.trim()) {
      throw new Error("Source collection id is required.");
    }
    if (!targetCollectionId.trim()) {
      throw new Error("Target collection id is required.");
    }

    return this.readwriteTransaction(
      [COMPONENTS_STORE, COLLECTIONS_STORE, LIBRARY_META_STORE],
      async (transaction) => {
        const componentStore = transaction.objectStore(COMPONENTS_STORE);
        const collectionStore = transaction.objectStore(COLLECTIONS_STORE);
        const libraryMetaStore = transaction.objectStore(LIBRARY_META_STORE);

        const meta = await requestToPromise<LibraryMeta | undefined>(libraryMetaStore.get(LIBRARY_ID));
        if (!meta) {
          throw new Error("Library metadata is missing.");
        }

        const existing = await requestToPromise<SavedComponent | undefined>(componentStore.get(id));
        if (!existing) {
          throw new Error("Component not found.");
        }
        const component = normalizeStoredComponent(existing, meta.defaultCollectionId);
        if (!component.collectionIds.includes(sourceCollectionId)) {
          throw new Error("Component is not in the source collection.");
        }

        const targetCollection = await requestToPromise<Collection | undefined>(
          collectionStore.get(targetCollectionId)
        );
        if (!targetCollection) {
          throw new Error("Target collection does not exist.");
        }

        if (sourceCollectionId === targetCollectionId) {
          return component;
        }

        const nextCollectionIds = Array.from(
          new Set(
            component.collectionIds.map((collectionId) =>
              collectionId === sourceCollectionId ? targetCollectionId : collectionId
            )
          )
        );
        const movedComponent: SavedComponent = {
          ...component,
          collectionIds: nextCollectionIds
        };
        componentStore.put(movedComponent);

        const now = new Date().toISOString();
        const updatedTargetCollection: Collection = {
          ...targetCollection,
          updatedAt: now
        };
        collectionStore.put(updatedTargetCollection);

        const sourceCollection = await requestToPromise<Collection | undefined>(
          collectionStore.get(sourceCollectionId)
        );
        if (sourceCollection) {
          const updatedSourceCollection: Collection = {
            ...sourceCollection,
            updatedAt: now
          };
          collectionStore.put(updatedSourceCollection);
        }

        const updatedMeta: LibraryMeta = {
          ...meta,
          updatedAt: now
        };
        libraryMetaStore.put(updatedMeta);

        return movedComponent;
      }
    );
  }

  async deleteComponent(id: string): Promise<void> {
    await this.initLibraryState();
    if (!id) {
      throw new Error("Component id is required.");
    }

    await this.readwriteTransaction([COMPONENTS_STORE, COLLECTIONS_STORE, LIBRARY_META_STORE], async (transaction) => {
      const componentStore = transaction.objectStore(COMPONENTS_STORE);
      const collectionStore = transaction.objectStore(COLLECTIONS_STORE);
      const libraryMetaStore = transaction.objectStore(LIBRARY_META_STORE);

      const meta = await requestToPromise<LibraryMeta | undefined>(libraryMetaStore.get(LIBRARY_ID));
      if (!meta) {
        throw new Error("Library metadata is missing.");
      }

      const existing = await requestToPromise<SavedComponent | undefined>(componentStore.get(id));
      if (!existing) {
        return;
      }
      const normalizedExisting = normalizeStoredComponent(existing, meta.defaultCollectionId);

      componentStore.delete(id);

      const now = new Date().toISOString();
      for (const collectionId of normalizedExisting.collectionIds) {
        const sourceCollection = await requestToPromise<Collection | undefined>(collectionStore.get(collectionId));
        if (!sourceCollection) {
          continue;
        }
        const updatedSourceCollection: Collection = {
          ...sourceCollection,
          updatedAt: now
        };
        collectionStore.put(updatedSourceCollection);
      }

      const updatedMeta: LibraryMeta = {
        ...meta,
        updatedAt: now
      };
      libraryMetaStore.put(updatedMeta);
    });
  }

  async saveSavedPreview(input: SavedPreview): Promise<SavedPreview> {
    await this.initLibraryState();
    if (!input.id) {
      throw new Error("Saved preview id is required.");
    }

    return this.readwriteTransaction([SAVED_PREVIEWS_STORE], async (transaction) => {
      const previewsStore = transaction.objectStore(SAVED_PREVIEWS_STORE);
      const existing = await requestToPromise<SavedPreview | undefined>(previewsStore.get(input.id));
      const now = new Date().toISOString();

      const next: SavedPreview = {
        ...input,
        status: input.status ?? "active",
        target: {
          ...input.target,
          pathname: normalizePathname(input.target.pathname)
        },
        createdAt: existing?.createdAt ?? input.createdAt ?? now,
        updatedAt: now,
        revision: existing ? Math.max(existing.revision + 1, input.revision || 1) : input.revision || 1,
        schemaVersion: input.schemaVersion || 1
      };
      previewsStore.put(next);
      return next;
    });
  }

  async listSavedPreviewsForPage(input: {
    origin: string;
    pathname: string;
  }): Promise<SavedPreviewListItem[]> {
    await this.initLibraryState();
    const normalizedPathname = normalizePathname(input.pathname);
    const previews = await this.readonlyTransaction([SAVED_PREVIEWS_STORE], async (transaction) => {
      const previewsStore = transaction.objectStore(SAVED_PREVIEWS_STORE);
      const byTargetOrigin = previewsStore.index(SAVED_PREVIEWS_BY_TARGET_ORIGIN_INDEX);
      return requestToPromise<SavedPreview[]>(byTargetOrigin.getAll(input.origin));
    });

    return previews
      .filter((preview) => {
        if (preview.status !== "active") {
          return false;
        }
        if (preview.target.matchMode === "exact_path") {
          return normalizePathname(preview.target.pathname) === normalizedPathname;
        }
        return normalizedPathname.startsWith(normalizePathname(preview.target.pathname));
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((preview) => ({
        id: preview.id,
        name: preview.name,
        status: preview.status,
        target: preview.target,
        updatedAt: preview.updatedAt,
        createdAt: preview.createdAt,
        revision: preview.revision
      }));
  }

  async getSavedPreview(id: string): Promise<SavedPreview | null> {
    await this.initLibraryState();
    if (!id) {
      return null;
    }
    return this.readonlyTransaction([SAVED_PREVIEWS_STORE], async (transaction) => {
      const previewsStore = transaction.objectStore(SAVED_PREVIEWS_STORE);
      const preview = await requestToPromise<SavedPreview | undefined>(previewsStore.get(id));
      return preview ?? null;
    });
  }

  async softDeleteSavedPreview(id: string): Promise<void> {
    await this.initLibraryState();
    if (!id) {
      throw new Error("Saved preview id is required.");
    }
    await this.readwriteTransaction([SAVED_PREVIEWS_STORE], async (transaction) => {
      const previewsStore = transaction.objectStore(SAVED_PREVIEWS_STORE);
      const existing = await requestToPromise<SavedPreview | undefined>(previewsStore.get(id));
      if (!existing) {
        return;
      }
      previewsStore.put({
        ...existing,
        status: "deleted",
        updatedAt: new Date().toISOString(),
        revision: existing.revision + 1
      });
    });
  }

  private async initLibraryState(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.ensureBaseLibraryRecords();
    }
    await this.initializationPromise;
  }

  private async ensureBaseLibraryRecords(): Promise<void> {
    await this.readwriteTransaction([LIBRARY_META_STORE, COLLECTIONS_STORE], async (transaction) => {
      const metaStore = transaction.objectStore(LIBRARY_META_STORE);
      const collectionStore = transaction.objectStore(COLLECTIONS_STORE);

      const now = new Date().toISOString();

      const inbox = await requestToPromise<Collection | undefined>(collectionStore.get(INBOX_COLLECTION_ID));
      if (!inbox) {
        const inboxCollection: Collection = {
          id: INBOX_COLLECTION_ID,
          name: INBOX_COLLECTION_NAME,
          description: INBOX_COLLECTION_DESCRIPTION,
          createdAt: now,
          updatedAt: now,
          isSystem: true
        };
        collectionStore.put(inboxCollection);
      }

      const meta = await requestToPromise<LibraryMeta | undefined>(metaStore.get(LIBRARY_ID));
      if (!meta) {
        const createdMeta: LibraryMeta = {
          id: LIBRARY_ID,
          createdAt: now,
          updatedAt: now,
          defaultCollectionId: INBOX_COLLECTION_ID
        };
        metaStore.put(createdMeta);
        return;
      }

      const shouldRepairMeta = meta.defaultCollectionId !== INBOX_COLLECTION_ID;
      if (shouldRepairMeta) {
        const repairedMeta: LibraryMeta = {
          ...meta,
          defaultCollectionId: INBOX_COLLECTION_ID,
          updatedAt: now
        };
        metaStore.put(repairedMeta);
      }
    });
  }

  private async readLibraryMeta(): Promise<LibraryMeta> {
    return this.readonlyTransaction([LIBRARY_META_STORE], async (transaction) => {
      const metaStore = transaction.objectStore(LIBRARY_META_STORE);
      const meta = await requestToPromise<LibraryMeta | undefined>(metaStore.get(LIBRARY_ID));
      if (!meta) {
        throw new Error("Library metadata not initialized.");
      }
      return meta;
    });
  }

  private async readonlyTransaction<T>(
    storeNames: string[],
    operation: (transaction: IDBTransaction) => Promise<T>
  ): Promise<T> {
    const database = await this.getDatabase();
    const transaction = database.transaction(storeNames, "readonly");
    const result = await operation(transaction);
    await waitForTransaction(transaction);
    return result;
  }

  private async readwriteTransaction<T>(
    storeNames: string[],
    operation: (transaction: IDBTransaction) => Promise<T>
  ): Promise<T> {
    const database = await this.getDatabase();
    const transaction = database.transaction(storeNames, "readwrite");
    const result = await operation(transaction);
    await waitForTransaction(transaction);
    return result;
  }

  private async getDatabase(): Promise<IDBDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = this.openLibraryDatabase();
    }
    return this.databasePromise;
  }

  private openLibraryDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(LIBRARY_META_STORE)) {
          database.createObjectStore(LIBRARY_META_STORE, { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains(COLLECTIONS_STORE)) {
          database.createObjectStore(COLLECTIONS_STORE, { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains(COMPONENTS_STORE)) {
          const componentStore = database.createObjectStore(COMPONENTS_STORE, { keyPath: "id" });
          componentStore.createIndex(COMPONENTS_BY_COLLECTION_INDEX, "collectionIds", {
            unique: false,
            multiEntry: true
          });
        }
        if (!database.objectStoreNames.contains(SAVED_PREVIEWS_STORE)) {
          const savedPreviewsStore = database.createObjectStore(SAVED_PREVIEWS_STORE, { keyPath: "id" });
          savedPreviewsStore.createIndex(SAVED_PREVIEWS_BY_TARGET_ORIGIN_INDEX, "target.origin", {
            unique: false
          });
          savedPreviewsStore.createIndex(SAVED_PREVIEWS_BY_STATUS_INDEX, "status", {
            unique: false
          });
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
        };
        resolve(database);
      };
      request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
    });
  }
}

export const libraryRepository: LibraryRepository = IndexedDbLibraryRepository.getInstance();
