import {
  decodeServerLifecycleEvent,
  SERVER_EVENTS_CHANNEL,
  type ServerLifecycleEvent,
} from "@tmcp/shared";
import type { Redis } from "ioredis";
import type { Logger } from "../../core/logger";

// Listens for server lifecycle events published by the web app; needs its own connection
export async function subscribeToLifecycleEvents(
  subscriber: Redis,
  handle: (event: ServerLifecycleEvent) => Promise<void>,
  log: Logger,
): Promise<() => Promise<void>> {
  subscriber.on("message", (channel: string, message: string) => {
    if (channel !== SERVER_EVENTS_CHANNEL) return;

    const event = decodeServerLifecycleEvent(message);
    if (!event) {
      log.warn({ message }, "Ignoring malformed server lifecycle event");
      return;
    }

    handle(event).catch((error) =>
      log.error({ err: error, event }, "Failed to handle server lifecycle event"),
    );
  });

  await subscriber.subscribe(SERVER_EVENTS_CHANNEL);
  return async () => {
    await subscriber.unsubscribe(SERVER_EVENTS_CHANNEL);
  };
}
