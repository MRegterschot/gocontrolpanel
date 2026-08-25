import "server-only";

import { GbxClientManager } from "../managers/gbxclient-manager";
import { subscribeServerEvents } from "./server-events";

export type EventHandlers = Record<string, (...args: any[]) => void>;

/**
 * Subscribes a WebSocket connection to a game server's events, from this
 * instance and from every other one.
 *
 * Both paths are needed. The local EventEmitter is the fast path and the one
 * that keeps working if Redis is down; the Redis subscription is what lets an
 * instance that does not own the XML-RPC connection still serve live data. The
 * bus drops events this process published, so a handler never fires twice.
 *
 * Returns a single teardown function; call it when the socket closes.
 */
export async function bindServerEvents(
  manager: GbxClientManager,
  listenerId: string,
  handlers: EventHandlers,
): Promise<() => void> {
  manager.addListeners(listenerId, handlers);

  const unsubscribe = await subscribeServerEvents(
    manager.getServerId(),
    (event, args) => {
      handlers[event]?.(...args);
    },
  );

  return () => {
    manager.removeListeners(listenerId);
    unsubscribe();
  };
}
