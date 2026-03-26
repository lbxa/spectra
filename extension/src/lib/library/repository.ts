import {
  INBOX_COLLECTION_DESCRIPTION,
  INBOX_COLLECTION_ID,
  INBOX_COLLECTION_NAME,
  LIBRARY_ID,
  type Collection,
  type LibraryMeta,
  type LibraryRepository,
  type SavedComponent
} from "./types";

const DATABASE_NAME = "spectra-library";
const DATABASE_VERSION = 1;

const LIBRARY_META_STORE = "libraryMeta";
const COLLECTIONS_STORE = "collections";
const COMPONENTS_STORE = "components";
const COMPONENTS_BY_COLLECTION_INDEX = "byCollectionId";

const COLLECTION_NAME_MAX_LENGTH = 60;
const COLLECTION_DESCRIPTION_MAX_LENGTH = 280;

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
    return collections.sort((left, right) => byDescendingDate(left.updatedAt, right.updatedAt));
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

        const inbox = await requestToPromise<Collection | undefined>(collectionStore.get(INBOX_COLLECTION_ID));
        if (!inbox) {
          throw new Error("Inbox collection is missing.");
        }

        const byCollectionIndex = componentStore.index(COMPONENTS_BY_COLLECTION_INDEX);
        const linkedComponents = await requestToPromise<SavedComponent[]>(byCollectionIndex.getAll(id));
        const now = new Date().toISOString();

        for (const component of linkedComponents) {
          const movedComponent: SavedComponent = {
            ...component,
            collectionId: INBOX_COLLECTION_ID
          };
          componentStore.put(movedComponent);
        }

        collectionStore.delete(id);
        const updatedInbox: Collection = {
          ...inbox,
          updatedAt: now
        };
        collectionStore.put(updatedInbox);

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
    return components.sort((left, right) => byDescendingDate(left.capturedAt, right.capturedAt));
  }

  async getComponent(id: string): Promise<SavedComponent | null> {
    await this.initLibraryState();
    if (!id) {
      return null;
    }

    return this.readonlyTransaction([COMPONENTS_STORE], async (transaction) => {
      const componentStore = transaction.objectStore(COMPONENTS_STORE);
      const component = await requestToPromise<SavedComponent | undefined>(componentStore.get(id));
      return component ?? null;
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

        const targetCollectionId = normalizeTargetCollectionId(input.collectionId, meta.defaultCollectionId);
        const targetCollection = await requestToPromise<Collection | undefined>(
          collectionStore.get(targetCollectionId)
        );
        if (!targetCollection) {
          throw new Error("Target collection does not exist.");
        }

        const normalizedComponent = normalizeComponentInput(input, targetCollectionId);
        componentStore.put(normalizedComponent);

        const now = new Date().toISOString();
        const updatedCollection: Collection = {
          ...targetCollection,
          updatedAt: now
        };
        collectionStore.put(updatedCollection);

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

  async moveComponent(id: string, targetCollectionId: string): Promise<SavedComponent> {
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

        const component = await requestToPromise<SavedComponent | undefined>(componentStore.get(id));
        if (!component) {
          throw new Error("Component not found.");
        }

        const targetCollection = await requestToPromise<Collection | undefined>(
          collectionStore.get(targetCollectionId)
        );
        if (!targetCollection) {
          throw new Error("Target collection does not exist.");
        }

        const movedComponent: SavedComponent = {
          ...component,
          collectionId: targetCollectionId
        };
        componentStore.put(movedComponent);

        const now = new Date().toISOString();
        const sourceCollection = await requestToPromise<Collection | undefined>(
          collectionStore.get(component.collectionId)
        );
        if (sourceCollection) {
          const updatedSourceCollection: Collection = {
            ...sourceCollection,
            updatedAt: now
          };
          collectionStore.put(updatedSourceCollection);
        }

        const updatedTargetCollection: Collection = {
          ...targetCollection,
          updatedAt: now
        };
        collectionStore.put(updatedTargetCollection);

        const meta = await requestToPromise<LibraryMeta | undefined>(libraryMetaStore.get(LIBRARY_ID));
        if (meta) {
          const updatedMeta: LibraryMeta = {
            ...meta,
            updatedAt: now
          };
          libraryMetaStore.put(updatedMeta);
        }

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

      const existing = await requestToPromise<SavedComponent | undefined>(componentStore.get(id));
      if (!existing) {
        return;
      }

      componentStore.delete(id);

      const sourceCollection = await requestToPromise<Collection | undefined>(
        collectionStore.get(existing.collectionId)
      );
      const now = new Date().toISOString();
      if (sourceCollection) {
        const updatedSourceCollection: Collection = {
          ...sourceCollection,
          updatedAt: now
        };
        collectionStore.put(updatedSourceCollection);
      }

      const meta = await requestToPromise<LibraryMeta | undefined>(libraryMetaStore.get(LIBRARY_ID));
      if (meta) {
        const updatedMeta: LibraryMeta = {
          ...meta,
          updatedAt: now
        };
        libraryMetaStore.put(updatedMeta);
      }
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
          componentStore.createIndex(COMPONENTS_BY_COLLECTION_INDEX, "collectionId", { unique: false });
        } else {
          const transaction = request.transaction;
          if (transaction) {
            const componentStore = transaction.objectStore(COMPONENTS_STORE);
            if (!componentStore.indexNames.contains(COMPONENTS_BY_COLLECTION_INDEX)) {
              componentStore.createIndex(COMPONENTS_BY_COLLECTION_INDEX, "collectionId", { unique: false });
            }
          }
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

function normalizeCollectionName(name: string): string {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Collection name is required.");
  }
  if (normalizedName.length > COLLECTION_NAME_MAX_LENGTH) {
    throw new Error(`Collection name must be ${COLLECTION_NAME_MAX_LENGTH} characters or fewer.`);
  }
  return normalizedName;
}

function normalizeCollectionDescription(description: string | undefined): string {
  const normalizedDescription = (description ?? "").trim();
  if (normalizedDescription.length > COLLECTION_DESCRIPTION_MAX_LENGTH) {
    throw new Error(`Collection description must be ${COLLECTION_DESCRIPTION_MAX_LENGTH} characters or fewer.`);
  }
  return normalizedDescription;
}

function normalizeComponentInput(input: SavedComponent, targetCollectionId: string): SavedComponent {
  if (!input.id.trim()) {
    throw new Error("Component id is required.");
  }
  if (!input.url.trim()) {
    throw new Error("Component URL is required.");
  }
  if (!input.html.trim()) {
    throw new Error("Component HTML is required.");
  }
  if (!input.screenshotDataUrl.trim()) {
    throw new Error("Component screenshot is required.");
  }

  const capturedAt = new Date(input.capturedAt);
  if (Number.isNaN(capturedAt.getTime())) {
    throw new Error("Component capturedAt must be a valid ISO timestamp.");
  }

  const fallbackTitle = deriveFallbackTitle(input.url);
  const normalizedTitle = input.title.trim() || fallbackTitle;

  return {
    id: input.id.trim(),
    collectionId: targetCollectionId,
    url: input.url.trim(),
    title: normalizedTitle,
    capturedAt: capturedAt.toISOString(),
    html: input.html,
    screenshotDataUrl: input.screenshotDataUrl
  };
}

function normalizeTargetCollectionId(collectionId: string, defaultCollectionId: string): string {
  const normalizedCollectionId = collectionId.trim();
  return normalizedCollectionId || defaultCollectionId;
}

function deriveFallbackTitle(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname) {
      return parsedUrl.hostname;
    }
  } catch {
    // Ignore parsing errors and use default fallback.
  }
  return "Untitled component";
}

function byDescendingDate(leftIso: string, rightIso: string): number {
  return new Date(rightIso).getTime() - new Date(leftIso).getTime();
}

function createId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}
