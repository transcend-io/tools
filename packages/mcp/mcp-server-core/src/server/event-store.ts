import type {
  EventStore,
  StreamId,
  EventId,
} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export type { EventStore, StreamId, EventId };

/**
 * Simple in-memory {@link EventStore} for SSE resumability.
 *
 * Suitable for single-process deployments where best-effort resume within
 * the process lifetime is acceptable. For durable replay across restarts
 * or multi-node setups, replace with a persistent implementation.
 */
export class InMemoryEventStore implements EventStore {
  private events = new Map<EventId, { streamId: StreamId; message: JSONRPCMessage }>();
  private seq = 0;

  async storeEvent(streamId: StreamId, message: JSONRPCMessage): Promise<EventId> {
    const eventId = `${streamId}_${String(this.seq++).padStart(10, '0')}`;
    this.events.set(eventId, { streamId, message });
    return eventId;
  }

  async getStreamIdForEventId(eventId: EventId): Promise<StreamId | undefined> {
    return this.events.get(eventId)?.streamId;
  }

  async replayEventsAfter(
    lastEventId: EventId,
    { send }: { send: (eventId: EventId, message: JSONRPCMessage) => Promise<void> },
  ): Promise<StreamId> {
    const entry = this.events.get(lastEventId);
    if (!entry) return '';

    const { streamId } = entry;
    let found = false;
    const sorted = [...this.events.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    for (const [eventId, { streamId: sid, message }] of sorted) {
      if (sid !== streamId) continue;
      if (eventId === lastEventId) {
        found = true;
        continue;
      }
      if (found) {
        await send(eventId, message);
      }
    }

    return streamId;
  }

  /** Remove all stored events. */
  clear(): void {
    this.events.clear();
  }
}
