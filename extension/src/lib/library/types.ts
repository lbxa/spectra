export type LibraryId = "library";

export type Collection = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  isSystem: boolean;
};

export type HostSignature = {
  landmark: "header" | "hero" | "main" | "section" | "article" | "aside" | "nav" | "footer" | "form" | "unknown";
  hostTag: string;
  layoutMode: "block" | "flex-row" | "flex-column" | "grid" | "inline" | "unknown";
  widthBucket: "xs" | "sm" | "md" | "lg" | "xl";
  depth: number;
  siblingCount: number;
  repeatedSiblingTag?: string;
  ancestorTags: string[];
  nearbyHeading?: string;
};

export type ThumbnailMeta = {
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number;
  dominantColor: string;
  blurredBackdropDataUrl: string;
};

export type SavedComponent = {
  id: string;
  collectionIds: string[];
  url: string;
  title: string;
  capturedAt: string;
  html: string;
  cssText: string;
  screenshotDataUrl: string;
  thumbnailMeta?: ThumbnailMeta;
  sourceHostSignature: HostSignature;
};

export type LibraryMeta = {
  id: LibraryId;
  createdAt: string;
  updatedAt: string;
  defaultCollectionId: string;
};

export interface LibraryRepository {
  getLibraryMeta(): Promise<LibraryMeta>;
  initLibrary(): Promise<void>;
  listCollections(): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | null>;
  createCollection(input: { name: string; description?: string }): Promise<Collection>;
  updateCollection(
    id: string,
    patch: Partial<Pick<Collection, "name" | "description">>
  ): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  listComponents(collectionId?: string): Promise<SavedComponent[]>;
  getComponent(id: string): Promise<SavedComponent | null>;
  saveComponent(input: SavedComponent): Promise<SavedComponent>;
  copyComponentToCollection(id: string, targetCollectionId: string): Promise<SavedComponent>;
  moveComponentToCollection(
    id: string,
    sourceCollectionId: string,
    targetCollectionId: string
  ): Promise<SavedComponent>;
  deleteComponent(id: string): Promise<void>;
}

export const LIBRARY_ID: LibraryId = "library";
export const INBOX_COLLECTION_ID = "inbox";
export const INBOX_COLLECTION_NAME = "Inbox";
export const INBOX_COLLECTION_DESCRIPTION = "Default collection for newly saved components";
