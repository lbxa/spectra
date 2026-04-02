import type {
  Collection,
  HostSignature,
  SavedComponent,
  SavedPreview,
  SavedPreviewApplyResult,
  SavedPreviewListItem
} from "./types";

export type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SaveComponentPayload = {
  html: string;
  cssText: string;
  url: string;
  title: string;
  bounds: Bounds;
  devicePixelRatio: number;
  sourceHostSignature: HostSignature;
};

export type StartCaptureMessage = {
  type: "START_CAPTURE";
  activeCollectionId: string;
};

export type SaveComponentMessage = {
  type: "SAVE_COMPONENT";
  payload: SaveComponentPayload;
};

export type SaveComponentResponse = {
  ok: boolean;
  error?: string;
  previewDataUrl?: string;
  component?: SavedComponent;
};

export type WorkerSessionState = "idle" | "starting" | "active" | "closed" | "error";

export type InsertPosition = "before" | "inside" | "after";
export type InsertionRelation = InsertPosition;
export type PreviewAlignment = "start" | "center" | "end";
export type PreviewPlacement = {
  position: InsertPosition;
  alignment: PreviewAlignment;
};

export type StartPreviewMessage = {
  type: "START_PREVIEW";
  activeCollectionId: string;
  component: SavedComponent;
};

export type ThemeTokenMap = Record<string, string>;

export type NativeExemplarStyle = {
  role: string;
  cssText: string;
};

export type TargetSiteContext = {
  globalThemeTokens: ThemeTokenMap;
  insertionContext: {
    hostTag: string;
    hostClasses: string[];
    nearbyHeading?: string;
    computedDisplay?: string;
    computedColor?: string;
    computedBackgroundColor?: string;
  };
  nativeExemplars: NativeExemplarStyle[];
  hardConstraints: {
    maxOverrideCssChars: number;
    protectedNodeIds: string[];
  };
  metadata: {
    pageUrl: string;
    pageTitle: string;
    themeFingerprint: string;
  };
};

export type ComponentPack = {
  normalizedHtml: string;
  baseCss: string;
  stableNodeIds: string[];
  semanticRoleHint: string;
  protectedNodeIds: string[];
  wrapperRootId: string;
};

export type AdaptRequest = {
  targetSiteContext: TargetSiteContext;
  componentPack: ComponentPack;
};

export type AdaptationPatch = {
  strategy: "css_override";
  summary: string;
  overrideCss: string;
  attributeEdits: Array<{
    nodeId: string;
    name: string;
    value: string;
  }>;
  preservedNodeIds: string[];
  confidence: number;
  warnings: string[];
};

export type AdaptComponentMessage = {
  type: "ADAPT_COMPONENT";
  payload: AdaptRequest;
};

export type AdaptComponentResponse = {
  ok: boolean;
  patch?: AdaptationPatch;
  error?: string;
};

export type SaveDerivedComponentMessage = {
  type: "SAVE_DERIVED_COMPONENT";
  payload: {
    sourceComponentId: string;
    html: string;
    cssText: string;
    summary: string;
    warnings: string[];
    confidence: number;
    themeFingerprint: string;
  };
};

export type SaveDerivedComponentResponse = {
  ok: boolean;
  component?: SavedComponent;
  error?: string;
};

export type SavePreviewSceneMessage = {
  type: "SAVE_PREVIEW_SCENE";
  payload: SavedPreview;
};

export type ListSavedPreviewsForPageMessage = {
  type: "LIST_SAVED_PREVIEWS_FOR_PAGE";
  payload: {
    origin: string;
    pathname: string;
  };
};

export type ApplySavedPreviewMessage = {
  type: "APPLY_SAVED_PREVIEW";
  payload: {
    previewId: string;
  };
};

export type ApplySavedPreviewOnTabMessage = {
  type: "APPLY_SAVED_PREVIEW_ON_TAB";
  payload: {
    previewId: string;
  };
};

export type BeginTargetingMessage = {
  type: "BEGIN_TARGETING";
  component: SavedComponent;
};

export type PreviewReadyMessage = {
  type: "PREVIEW_READY";
  tabId?: number;
};

export type PreviewInsertedMessage = {
  type: "PREVIEW_INSERTED";
  previewId: string;
  relation: InsertionRelation;
};

export type PreviewRemovedMessage = {
  type: "PREVIEW_REMOVED";
  previewId: string;
};

export type PreviewErrorMessage = {
  type: "PREVIEW_ERROR";
  code: string;
  message: string;
};

export type MagicStatusMessage = {
  type:
    | "MAGIC_CLICKED"
    | "MAGIC_REQUEST_STARTED"
    | "MAGIC_REQUEST_SUCCEEDED"
    | "MAGIC_REQUEST_FAILED"
    | "MAGIC_PATCH_APPLIED"
    | "MAGIC_PATCH_REJECTED"
    | "MAGIC_ADAPTED_REVISION_SAVED";
  previewId?: string;
  componentId?: string;
  code?: string;
  message?: string;
};

export type PreviewStatusMessage =
  | PreviewReadyMessage
  | PreviewInsertedMessage
  | PreviewRemovedMessage
  | PreviewErrorMessage
  | MagicStatusMessage;

export type SavePreviewSceneResponse = {
  ok: boolean;
  preview?: SavedPreview;
  error?: string;
};

export type ListSavedPreviewsForPageResponse = {
  ok: boolean;
  previews: SavedPreviewListItem[];
  error?: string;
};

export type ApplySavedPreviewResponse = {
  ok: boolean;
  preview?: SavedPreview;
  components?: SavedComponent[];
  results?: SavedPreviewApplyResult[];
  error?: string;
};

export type ApplySavedPreviewOnTabResponse = {
  ok: boolean;
  error?: string;
};

export type LibraryEventType =
  | "COMPONENT_SAVED"
  | "COLLECTION_CREATED"
  | "COLLECTION_UPDATED"
  | "COLLECTION_DELETED"
  | "COMPONENT_MOVED"
  | "COMPONENT_DELETED";

export type LibraryUpdatedMessage = {
  type: "LIBRARY_UPDATED";
  payload: {
    event: LibraryEventType;
    collection?: Collection;
    component?: SavedComponent;
    id?: string;
    collectionId?: string;
  };
};

export type IncomingRuntimeMessage =
  | StartCaptureMessage
  | SaveComponentMessage
  | SaveDerivedComponentMessage
  | StartPreviewMessage
  | AdaptComponentMessage
  | SavePreviewSceneMessage
  | ListSavedPreviewsForPageMessage
  | ApplySavedPreviewMessage
  | ApplySavedPreviewOnTabMessage
  | PreviewStatusMessage;

export function isIncomingRuntimeMessage(message: unknown): message is IncomingRuntimeMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (!("type" in message)) {
    return false;
  }

  if (message.type === "START_CAPTURE") {
    return "activeCollectionId" in message && typeof message.activeCollectionId === "string";
  }

  if (message.type === "SAVE_COMPONENT") {
    return "payload" in message;
  }

  if (message.type === "START_PREVIEW") {
    return (
      "component" in message &&
      "activeCollectionId" in message &&
      typeof message.activeCollectionId === "string"
    );
  }

  if (message.type === "SAVE_DERIVED_COMPONENT") {
    return "payload" in message;
  }

  if (message.type === "ADAPT_COMPONENT") {
    return "payload" in message;
  }

  if (message.type === "SAVE_PREVIEW_SCENE") {
    return "payload" in message;
  }

  if (message.type === "LIST_SAVED_PREVIEWS_FOR_PAGE") {
    return "payload" in message;
  }

  if (message.type === "APPLY_SAVED_PREVIEW") {
    return "payload" in message;
  }

  if (message.type === "APPLY_SAVED_PREVIEW_ON_TAB") {
    return "payload" in message;
  }

  return (
    message.type === "PREVIEW_READY" ||
    message.type === "PREVIEW_INSERTED" ||
    message.type === "PREVIEW_REMOVED" ||
    message.type === "PREVIEW_ERROR" ||
    message.type === "MAGIC_CLICKED" ||
    message.type === "MAGIC_REQUEST_STARTED" ||
    message.type === "MAGIC_REQUEST_SUCCEEDED" ||
    message.type === "MAGIC_REQUEST_FAILED" ||
    message.type === "MAGIC_PATCH_APPLIED" ||
    message.type === "MAGIC_PATCH_REJECTED" ||
    message.type === "MAGIC_ADAPTED_REVISION_SAVED"
  );
}

export function isLibraryUpdatedMessage(message: unknown): message is LibraryUpdatedMessage {
  if (!message || typeof message !== "object") {
    return false;
  }
  if (!("type" in message)) {
    return false;
  }
  return message.type === "LIBRARY_UPDATED";
}

export function isPreviewStatusMessage(message: unknown): message is PreviewStatusMessage {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return false;
  }
  return (
    message.type === "PREVIEW_READY" ||
    message.type === "PREVIEW_INSERTED" ||
    message.type === "PREVIEW_REMOVED" ||
    message.type === "PREVIEW_ERROR" ||
    message.type === "MAGIC_CLICKED" ||
    message.type === "MAGIC_REQUEST_STARTED" ||
    message.type === "MAGIC_REQUEST_SUCCEEDED" ||
    message.type === "MAGIC_REQUEST_FAILED" ||
    message.type === "MAGIC_PATCH_APPLIED" ||
    message.type === "MAGIC_PATCH_REJECTED" ||
    message.type === "MAGIC_ADAPTED_REVISION_SAVED"
  );
}
