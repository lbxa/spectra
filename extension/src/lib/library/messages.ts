import type { Collection, SavedComponent } from "./types";

export type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SaveComponentPayload = {
  html: string;
  url: string;
  title: string;
  bounds: Bounds;
  devicePixelRatio: number;
};

export type StartCaptureMessage = {
  type: "START_CAPTURE";
};

export type SaveComponentMessage = {
  type: "SAVE_COMPONENT";
  payload: SaveComponentPayload;
};

export type SaveComponentResponse = {
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

export type IncomingRuntimeMessage = StartCaptureMessage | SaveComponentMessage;

export function isIncomingRuntimeMessage(message: unknown): message is IncomingRuntimeMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (!("type" in message)) {
    return false;
  }

  if (message.type === "START_CAPTURE") {
    return true;
  }

  return message.type === "SAVE_COMPONENT" && "payload" in message;
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
