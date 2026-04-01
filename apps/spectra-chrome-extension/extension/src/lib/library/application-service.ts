import type { EventPublisher } from "../events/event-publisher";
import {
  collectionCreatedEvent,
  collectionDeletedEvent,
  collectionUpdatedEvent,
  componentDeletedEvent,
  componentMovedEvent,
  componentSavedEvent
} from "./domain-events";
import type { Collection, LibraryRepository, SavedComponent } from "./types";

export class LibraryApplicationService {
  constructor(
    private readonly repository: LibraryRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  async saveComponent(component: SavedComponent): Promise<SavedComponent> {
    const saved = await this.repository.saveComponent(component);
    await this.eventPublisher.publish(componentSavedEvent(saved, saved.collectionIds[0]));
    return saved;
  }

  async createCollection(input: { name: string; description?: string }): Promise<Collection> {
    const collection = await this.repository.createCollection(input);
    await this.eventPublisher.publish(collectionCreatedEvent(collection));
    return collection;
  }

  async updateCollection(
    collectionId: string,
    patch: Partial<Pick<Collection, "name" | "description">>
  ): Promise<Collection> {
    const updated = await this.repository.updateCollection(collectionId, patch);
    await this.eventPublisher.publish(collectionUpdatedEvent(updated));
    return updated;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.repository.deleteCollection(collectionId);
    await this.eventPublisher.publish(collectionDeletedEvent(collectionId));
  }

  async copyComponentToCollection(componentId: string, targetCollectionId: string): Promise<SavedComponent> {
    const copied = await this.repository.copyComponentToCollection(componentId, targetCollectionId);
    await this.eventPublisher.publish(componentMovedEvent(copied));
    return copied;
  }

  async moveComponentToCollection(
    componentId: string,
    sourceCollectionId: string,
    targetCollectionId: string
  ): Promise<SavedComponent> {
    const moved = await this.repository.moveComponentToCollection(
      componentId,
      sourceCollectionId,
      targetCollectionId
    );
    await this.eventPublisher.publish(componentMovedEvent(moved));
    return moved;
  }

  async deleteComponent(componentId: string, collectionId?: string): Promise<void> {
    await this.repository.deleteComponent(componentId);
    await this.eventPublisher.publish(componentDeletedEvent(componentId, collectionId));
  }
}
