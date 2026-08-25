import "server-only";

import { randomUUID } from "node:crypto";
import { logger } from "../logger";
import { getRedisClient, getRedisSubscriber } from "../redis";

/**
 * Cross-instance fan-out for game-server events.
 *
 * `GbxClientManager` holds the XML-RPC connection and the live match state in
 * process memory, and the WebSocket routes attach listeners straight to it. That
 * works for exactly one instance: a second replica opens a second connection per
 * game server and serves divergent state.
 *
 * This relays every local event through Redis so other instances can fan it out
 * to their own WebSocket clients. It is deliberately *additive*: local listeners
 * still fire directly off the EventEmitter, so if Redis is unavailable the
 * single-instance behaviour is exactly what it was before. Redis only carries
 * events *between* instances.
 *
 * The GBX worker itself must still be a singleton -- this makes the web tier
 * able to scale, not the connection owner.
 */

/** Identifies this process, so it can ignore the events it published itself. */
const INSTANCE_ID = randomUUID();

type Envelope = {
  /** Publisher's instance id. */
  i: string;
  /** Event name. */
  e: string;
  /** The emitter's full argument list. Some events carry more than one. */
  a: unknown[];
};

const channelFor = (serverId: string) => `server-events:${serverId}`;

type Handler = (event: string, args: unknown[]) => void;

/** Per-channel local handler sets, so one Redis subscription serves many sockets. */
const handlers = new Map<string, Set<Handler>>();

function meta(fn: string) {
  return { type: "events", module: "server-events", function: fn };
}

/**
 * Publishes a local event to the other instances.
 *
 * Failures are logged and swallowed: a Redis outage must degrade fan-out to
 * single-instance behaviour, never break the live feed or the GBX event loop.
 */
export async function publishServerEvent(
  serverId: string,
  event: string,
  args: unknown[],
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const envelope: Envelope = { i: INSTANCE_ID, e: event, a: args };
    await redis.publish(channelFor(serverId), JSON.stringify(envelope));
  } catch (error) {
    logger.debug(
      { meta: meta("publishServerEvent"), error, serverId, event },
      "Could not publish server event; continuing with local delivery only",
    );
  }
}

/**
 * Delivers events published by *other* instances for this game server.
 *
 * Returns an unsubscribe function. Events published by this process are dropped,
 * because local listeners have already received them straight from the emitter.
 */
export async function subscribeServerEvents(
  serverId: string,
  handler: Handler,
): Promise<() => void> {
  const channel = channelFor(serverId);
  let set = handlers.get(channel);

  if (!set) {
    set = new Set();
    handlers.set(channel, set);

    try {
      const subscriber = await getRedisSubscriber();
      await subscriber.subscribe(channel);
    } catch (error) {
      logger.debug(
        { meta: meta("subscribeServerEvents"), error, serverId },
        "Could not subscribe to server events; local delivery only",
      );
    }
  }

  set.add(handler);

  return () => {
    const current = handlers.get(channel);
    if (!current) return;

    current.delete(handler);

    if (current.size === 0) {
      handlers.delete(channel);
      // Best effort: an orphaned subscription only wastes a little traffic.
      void getRedisSubscriber()
        .then((subscriber) => subscriber.unsubscribe(channel))
        .catch(() => {});
    }
  };
}

/**
 * Wires the shared subscriber connection to the handler registry. Idempotent --
 * `getRedisSubscriber` calls it once per connection.
 */
export function attachSubscriberDispatch(
  subscriber: import("ioredis").Redis,
): void {
  subscriber.on("message", (channel: string, raw: string) => {
    const set = handlers.get(channel);
    if (!set || set.size === 0) return;

    let envelope: Envelope;
    try {
      envelope = JSON.parse(raw) as Envelope;
    } catch {
      logger.warn(
        { meta: meta("attachSubscriberDispatch"), channel },
        "Discarded malformed server event",
      );
      return;
    }

    // Our own events already reached local listeners directly.
    if (envelope.i === INSTANCE_ID) return;

    for (const handler of set) {
      try {
        handler(envelope.e, envelope.a ?? []);
      } catch (error) {
        logger.error(
          { meta: meta("attachSubscriberDispatch"), error, channel },
          "Server event handler threw",
        );
      }
    }
  });
}

/** Exposed for tests. */
export const __testing = { INSTANCE_ID, channelFor, handlers };
