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

export type PreviewMatchMode = "exact_path" | "path_prefix";

export type AnchorStrategy = "selector" | "text" | "structure";

export type AnchorFingerprint = {
  tagName?: string;
  classTokens?: string[];
  textSnippet?: string;
  siblingSignature?: string[];
};

export type AnchorSpec = {
  strategy: AnchorStrategy;
  primarySelector?: string;
  fallbackSelectors: string[];
  fingerprint?: AnchorFingerprint;
};

export type PreviewRenderSpec = {
  visible: boolean;
  wrapperBox?: {
    width?: string;
    maxWidth?: string;
    zIndex?: number;
  };
};

export type PreviewPlacementSpec = {
  anchor: AnchorSpec;
  insertionMode: "before" | "inside" | "after";
  alignment: "start" | "center" | "end";
  order: number;
};

export type SavedPreviewInstance = {
  id: string;
  componentId: string;
  componentVersion: number;
  placement: PreviewPlacementSpec;
  render: PreviewRenderSpec;
  layout?: {
    referenceViewport: {
      width: number;
      height: number;
    };
    normalizedRect: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
};

export type SavedPreviewTarget = {
  origin: string;
  pathname: string;
  matchMode: PreviewMatchMode;
  canonicalUrl: string;
};

export type SavedPreviewApplyStatus =
  | "applied"
  | "applied_with_fallback"
  | "anchor_not_found"
  | "component_missing"
  | "behavior_disabled";

export type SavedPreviewApplyResult = {
  instanceId: string;
  status: SavedPreviewApplyStatus;
  resolvedSelector?: string;
  reason?: string;
};

export type SavedPreview = {
  id: string;
  name: string;
  status: "active" | "archived" | "deleted";
  target: SavedPreviewTarget;
  instances: SavedPreviewInstance[];
  createdAt: string;
  updatedAt: string;
  revision: number;
  schemaVersion: number;
};

export type SavedPreviewListItem = Pick<
  SavedPreview,
  "id" | "name" | "status" | "target" | "updatedAt" | "createdAt" | "revision"
>;

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
  saveSavedPreview(input: SavedPreview): Promise<SavedPreview>;
  listSavedPreviewsForPage(input: { origin: string; pathname: string }): Promise<SavedPreviewListItem[]>;
  getSavedPreview(id: string): Promise<SavedPreview | null>;
  softDeleteSavedPreview(id: string): Promise<void>;
}

export const LIBRARY_ID: LibraryId = "library";
export const INBOX_COLLECTION_ID = "inbox";
export const INBOX_COLLECTION_NAME = "Inbox";
export const INBOX_COLLECTION_DESCRIPTION = "Default collection for newly saved components";
