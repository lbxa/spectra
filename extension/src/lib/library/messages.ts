import type { Collection, HostSignature, SavedComponent } from "./types";

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

export type PreviewStatusMessage =
  | PreviewReadyMessage
  | PreviewInsertedMessage
  | PreviewRemovedMessage
  | PreviewErrorMessage;

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

export type IncomingRuntimeMessage = StartCaptureMessage | SaveComponentMessage | StartPreviewMessage | PreviewStatusMessage;

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

  return (
    message.type === "PREVIEW_READY" ||
    message.type === "PREVIEW_INSERTED" ||
    message.type === "PREVIEW_REMOVED" ||
    message.type === "PREVIEW_ERROR"
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
    message.type === "PREVIEW_ERROR"
  );
}
