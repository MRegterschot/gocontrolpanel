import {
  decodeServerLifecycleEvent,
  SERVER_EVENTS_CHANNEL,
  SERVER_EVENTS_CHANNEL_NEXT,
  type ServerLifecycleEvent,
} from "@tmcontrolpanel/shared";
import type { Redis } from "ioredis";
import type { Logger } from "../../core/logger";

const CHANNELS = [SERVER_EVENTS_CHANNEL, SERVER_EVENTS_CHANNEL_NEXT];
// A bridging publisher may send the same message on both channels in quick succession
const DEDUPE_WINDOW_MS = 1000;

// Listens for server lifecycle events published by the web app; needs its own connection
export async function subscribeToLifecycleEvents(
  subscriber: Redis,
  handle: (event: ServerLifecycleEvent) => Promise<void>,
  log: Logger,
): Promise<() => Promise<void>> {
  const recent = new Map<string, { channel: string; at: number }>();

  subscriber.on("message", (channel: string, message: string) => {
    if (!CHANNELS.includes(channel)) return;

    const now = Date.now();
    for (const [key, seen] of recent) {
      if (now - seen.at > DEDUPE_WINDOW_MS) recent.delete(key);
    }
    const seen = recent.get(message);
    if (seen && seen.channel !== channel) return;
    recent.set(message, { channel, at: now });

    const event = decodeServerLifecycleEvent(message);
    if (!event) {
      log.warn({ message }, "Ignoring malformed server lifecycle event");
      return;
    }

    handle(event).catch((error) =>
      log.error({ err: error, event }, "Failed to handle server lifecycle event"),
    );
  });

  await subscriber.subscribe(...CHANNELS);
  return async () => {
    await subscriber.unsubscribe(...CHANNELS);
  };
}
