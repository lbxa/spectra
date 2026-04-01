import type { LibraryDomainEvent } from "../library/domain-events";

export interface EventPublisher {
  publish(event: LibraryDomainEvent): Promise<void>;
}
