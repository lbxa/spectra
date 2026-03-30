import type { DomainEvent } from "../events/domain-event";
import type { Collection, SavedComponent } from "./types";

export type LibraryDomainEvent = DomainEvent<
  "COMPONENT_SAVED" | "COLLECTION_CREATED" | "COLLECTION_UPDATED" | "COLLECTION_DELETED" | "COMPONENT_MOVED" | "COMPONENT_DELETED",
  {
    collection?: Collection;
    component?: SavedComponent;
    id?: string;
    collectionId?: string;
  }
>;

export function componentSavedEvent(
  component: SavedComponent,
  collectionId: string | undefined
): LibraryDomainEvent {
  return {
    type: "COMPONENT_SAVED",
    payload: {
      component,
      collectionId
    }
  };
}

export function collectionCreatedEvent(collection: Collection): LibraryDomainEvent {
  return {
    type: "COLLECTION_CREATED",
    payload: {
      collection
    }
  };
}

export function collectionUpdatedEvent(collection: Collection): LibraryDomainEvent {
  return {
    type: "COLLECTION_UPDATED",
    payload: {
      collection
    }
  };
}

export function collectionDeletedEvent(id: string): LibraryDomainEvent {
  return {
    type: "COLLECTION_DELETED",
    payload: {
      id
    }
  };
}

export function componentMovedEvent(component: SavedComponent): LibraryDomainEvent {
  return {
    type: "COMPONENT_MOVED",
    payload: {
      component
    }
  };
}

export function componentDeletedEvent(id: string, collectionId?: string): LibraryDomainEvent {
  return {
    type: "COMPONENT_DELETED",
    payload: {
      id,
      collectionId
    }
  };
}
