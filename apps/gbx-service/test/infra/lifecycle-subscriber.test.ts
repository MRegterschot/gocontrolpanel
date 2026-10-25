import { EventEmitter } from "node:events";
import {
  SERVER_EVENTS_CHANNEL,
  SERVER_EVENTS_CHANNEL_NEXT,
  type ServerLifecycleEvent,
} from "@tmcontrolpanel/shared";
import type { Redis } from "ioredis";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { subscribeToLifecycleEvents } from "../../src/infra/redis/lifecycle-subscriber";

const log = pino({ level: "silent" });
const created = JSON.stringify({ type: "server.created", serverId: "s1" });

function setup() {
  const emitter = new EventEmitter();
  const subscribed: string[] = [];
  const subscriber = Object.assign(emitter, {
    subscribe: async (...channels: string[]) => void subscribed.push(...channels),
    unsubscribe: async () => {},
  }) as unknown as Redis;
  const handled: ServerLifecycleEvent[] = [];
  return { emitter, subscribed, handled, subscriber, handle: async (e: ServerLifecycleEvent) => void handled.push(e) };
}

describe("subscribeToLifecycleEvents", () => {
  it("listens on the legacy and the new channel", async () => {
    const t = setup();
    await subscribeToLifecycleEvents(t.subscriber, t.handle, log);
    expect(t.subscribed).toEqual([SERVER_EVENTS_CHANNEL, SERVER_EVENTS_CHANNEL_NEXT]);

    t.emitter.emit("message", SERVER_EVENTS_CHANNEL, created);
    t.emitter.emit("message", "other:channel", created);
    await Promise.resolve();
    expect(t.handled).toHaveLength(1);
  });

  it("handles an event bridged to both channels once", async () => {
    const t = setup();
    await subscribeToLifecycleEvents(t.subscriber, t.handle, log);
    t.emitter.emit("message", SERVER_EVENTS_CHANNEL, created);
    t.emitter.emit("message", SERVER_EVENTS_CHANNEL_NEXT, created);
    await Promise.resolve();
    expect(t.handled).toHaveLength(1);
  });

  it("does not collapse repeated events on the same channel", async () => {
    const t = setup();
    await subscribeToLifecycleEvents(t.subscriber, t.handle, log);
    t.emitter.emit("message", SERVER_EVENTS_CHANNEL_NEXT, created);
    t.emitter.emit("message", SERVER_EVENTS_CHANNEL_NEXT, created);
    await Promise.resolve();
    expect(t.handled).toHaveLength(2);
  });
});
