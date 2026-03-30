import type { LibraryUpdatedMessage } from "../library/messages";
import type { LibraryDomainEvent } from "../library/domain-events";
import type { EventPublisher } from "./event-publisher";

function toLibraryUpdatedMessage(event: LibraryDomainEvent): LibraryUpdatedMessage {
  return {
    type: "LIBRARY_UPDATED",
    payload: {
      event: event.type,
      ...event.payload
    }
  };
}

export class ChromeRuntimeEventPublisher implements EventPublisher {
  async publish(event: LibraryDomainEvent): Promise<void> {
    const message = toLibraryUpdatedMessage(event);
    try {
      await chrome.runtime.sendMessage(message);
    } catch {
      // Ignore when no extension views are listening.
    }
  }
}
