import {
  INBOX_COLLECTION_DESCRIPTION,
  INBOX_COLLECTION_ID,
  INBOX_COLLECTION_NAME,
  LIBRARY_ID,
  type Collection,
  type HostSignature,
  type LibraryMeta,
  type LibraryRepository,
  type SavedComponent,
  type ThumbnailMeta
} from "./types";

const DATABASE_NAME = "spectra-library-v2";
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
    return components
      .map((component) => normalizeStoredComponent(component, INBOX_COLLECTION_ID))
      .sort((left, right) => byDescendingDate(left.capturedAt, right.capturedAt));
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
          collectionIds: [...component.collectionIds, targetCollectionId]
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
        database.createObjectStore(LIBRARY_META_STORE, { keyPath: "id" });
        database.createObjectStore(COLLECTIONS_STORE, { keyPath: "id" });
        const componentStore = database.createObjectStore(COMPONENTS_STORE, { keyPath: "id" });
        componentStore.createIndex(COMPONENTS_BY_COLLECTION_INDEX, "collectionIds", {
          unique: false,
          multiEntry: true
        });
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

function normalizeComponentInput(input: SavedComponent, defaultCollectionId: string): SavedComponent {
  if (!input.id.trim()) {
    throw new Error("Component id is required.");
  }
  if (!input.url.trim()) {
    throw new Error("Component URL is required.");
  }
  if (!input.html.trim()) {
    throw new Error("Component HTML is required.");
  }
  if (typeof input.cssText !== "string") {
    throw new Error("Component CSS must be a string.");
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
  const normalizedCollectionIds = normalizeCollectionIds(input.collectionIds, defaultCollectionId);

  return {
    id: input.id.trim(),
    collectionIds: normalizedCollectionIds,
    url: input.url.trim(),
    title: normalizedTitle,
    capturedAt: capturedAt.toISOString(),
    html: input.html,
    cssText: input.cssText,
    screenshotDataUrl: input.screenshotDataUrl,
    thumbnailMeta: normalizeThumbnailMeta(input.thumbnailMeta),
    sourceHostSignature: normalizeHostSignature(input.sourceHostSignature)
  };
}

function normalizeCollectionIds(collectionIds: string[] | undefined, defaultCollectionId: string): string[] {
  const normalized = Array.from(
    new Set((collectionIds ?? []).map((collectionId) => collectionId.trim()).filter(Boolean))
  );
  if (normalized.length > 0) {
    return normalized;
  }
  const fallbackCollectionId = defaultCollectionId.trim();
  return fallbackCollectionId ? [fallbackCollectionId] : [INBOX_COLLECTION_ID];
}

function normalizeStoredComponent(component: SavedComponent, defaultCollectionId: string): SavedComponent {
  const collectionIds = normalizeCollectionIds(component.collectionIds, defaultCollectionId);
  const sourceHostSignature = normalizeHostSignature(component.sourceHostSignature);
  return {
    ...component,
    collectionIds,
    cssText: typeof component.cssText === "string" ? component.cssText : "",
    sourceHostSignature
  };
}

function normalizeHostSignature(value: HostSignature | undefined): HostSignature {
  if (!value || typeof value !== "object") {
    return createUnknownHostSignature();
  }

  const ancestorTags = Array.isArray(value.ancestorTags)
    ? value.ancestorTags.filter((tag) => typeof tag === "string")
    : [];

  return {
    landmark: normalizeLandmark(value.landmark),
    hostTag: typeof value.hostTag === "string" && value.hostTag ? value.hostTag : "div",
    layoutMode: normalizeLayoutMode(value.layoutMode),
    widthBucket: normalizeWidthBucket(value.widthBucket),
    depth: Number.isFinite(value.depth) ? Math.max(0, Math.floor(value.depth)) : 0,
    siblingCount: Number.isFinite(value.siblingCount) ? Math.max(0, Math.floor(value.siblingCount)) : 0,
    repeatedSiblingTag:
      typeof value.repeatedSiblingTag === "string" && value.repeatedSiblingTag ? value.repeatedSiblingTag : undefined,
    ancestorTags,
    nearbyHeading: typeof value.nearbyHeading === "string" && value.nearbyHeading ? value.nearbyHeading : undefined
  };
}

function normalizeThumbnailMeta(value: ThumbnailMeta | undefined): ThumbnailMeta | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const originalWidth = toPositiveInteger(value.originalWidth);
  const originalHeight = toPositiveInteger(value.originalHeight);
  const aspectRatio = Number.isFinite(value.aspectRatio) && value.aspectRatio > 0
    ? value.aspectRatio
    : originalWidth / originalHeight;
  const dominantColor = typeof value.dominantColor === "string" ? value.dominantColor.trim() : "";
  const blurredBackdropDataUrl =
    typeof value.blurredBackdropDataUrl === "string" ? value.blurredBackdropDataUrl.trim() : "";

  if (!originalWidth || !originalHeight || !dominantColor || !blurredBackdropDataUrl) {
    return undefined;
  }

  return {
    originalWidth,
    originalHeight,
    aspectRatio,
    dominantColor,
    blurredBackdropDataUrl
  };
}

function toPositiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 0;
}

function createUnknownHostSignature(): HostSignature {
  return {
    landmark: "unknown",
    hostTag: "div",
    layoutMode: "unknown",
    widthBucket: "md",
    depth: 0,
    siblingCount: 0,
    ancestorTags: []
  };
}

function normalizeLandmark(value: HostSignature["landmark"] | undefined): HostSignature["landmark"] {
  if (
    value === "header" ||
    value === "hero" ||
    value === "main" ||
    value === "section" ||
    value === "article" ||
    value === "aside" ||
    value === "nav" ||
    value === "footer" ||
    value === "form" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function normalizeLayoutMode(value: HostSignature["layoutMode"] | undefined): HostSignature["layoutMode"] {
  if (
    value === "block" ||
    value === "flex-row" ||
    value === "flex-column" ||
    value === "grid" ||
    value === "inline" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function normalizeWidthBucket(value: HostSignature["widthBucket"] | undefined): HostSignature["widthBucket"] {
  if (value === "xs" || value === "sm" || value === "md" || value === "lg" || value === "xl") {
    return value;
  }
  return "md";
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
