import { describe, expect, it, vi } from "vitest";

/**
 * The bus is exercised through a stubbed ioredis so these stay unit tests: no
 * Redis, no game server. What matters here is the wiring -- envelope shape,
 * self-filtering, refcounting and failure tolerance -- not Redis itself.
 */
const publish = vi.fn().mockResolvedValue(1);
const subscribe = vi.fn().mockResolvedValue(1);
const unsubscribe = vi.fn().mockResolvedValue(1);
let dispatch: ((channel: string, raw: string) => void) | undefined;

vi.mock("@/lib/redis", () => ({
  getRedisClient: async () => ({ publish }),
  getRedisSubscriber: async () => ({ subscribe, unsubscribe, on: vi.fn() }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/global", () => ({ appGlobals: {} }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const {
  publishServerEvent,
  subscribeServerEvents,
  attachSubscriberDispatch,
  __testing,
} = await import("../events/server-events");

// Capture the dispatcher the module installs on the subscriber connection.
attachSubscriberDispatch({
  on: (_event: string, handler: (channel: string, raw: string) => void) => {
    dispatch = handler;
  },
} as never);

const CHANNEL = __testing.channelFor("server-1");

describe("publishServerEvent", () => {
  it("publishes an envelope carrying the instance, event and full args", async () => {
    publish.mockClear();
    await publishServerEvent("server-1", "playerChat", [{ text: "gg" }]);

    const [channel, raw] = publish.mock.calls[0];
    expect(channel).toBe(CHANNEL);
    expect(JSON.parse(raw)).toEqual({
      i: __testing.INSTANCE_ID,
      e: "playerChat",
      a: [{ text: "gg" }],
    });
  });

  it("swallows a Redis failure rather than breaking the caller", async () => {
    publish.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    // A publish failure must degrade to local-only delivery, never propagate
    // into the GBX event loop.
    await expect(
      publishServerEvent("server-1", "finish", [{}]),
    ).resolves.toBeUndefined();
  });
});

describe("subscribeServerEvents", () => {
  it("delivers events published by another instance", async () => {
    const handler = vi.fn();
    const off = await subscribeServerEvents("server-1", handler);

    dispatch!(CHANNEL, JSON.stringify({ i: "other", e: "finish", a: [1, 2] }));

    expect(handler).toHaveBeenCalledWith("finish", [1, 2]);
    off();
  });

  it("drops events this instance published itself", async () => {
    const handler = vi.fn();
    const off = await subscribeServerEvents("server-1", handler);

    // Local listeners already received these straight off the EventEmitter;
    // delivering them again would double-fire every handler.
    dispatch!(
      CHANNEL,
      JSON.stringify({ i: __testing.INSTANCE_ID, e: "finish", a: [1] }),
    );

    expect(handler).not.toHaveBeenCalled();
    off();
  });

  it("subscribes once per channel however many sockets attach", async () => {
    subscribe.mockClear();
    const a = await subscribeServerEvents("server-1", vi.fn());
    const b = await subscribeServerEvents("server-1", vi.fn());

    expect(subscribe).toHaveBeenCalledTimes(1);

    a();
    b();
  });

  it("unsubscribes only once the last handler detaches", async () => {
    unsubscribe.mockClear();
    const a = await subscribeServerEvents("server-1", vi.fn());
    const b = await subscribeServerEvents("server-1", vi.fn());

    a();
    expect(unsubscribe).not.toHaveBeenCalled();

    b();
    await new Promise((r) => setTimeout(r, 0));
    expect(unsubscribe).toHaveBeenCalledWith(CHANNEL);
  });

  it("ignores malformed payloads instead of throwing in the dispatcher", async () => {
    const handler = vi.fn();
    const off = await subscribeServerEvents("server-1", handler);

    expect(() => dispatch!(CHANNEL, "{not json")).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
    off();
  });

  it("keeps dispatching after one handler throws", async () => {
    const bad = vi.fn(() => {
      throw new Error("handler blew up");
    });
    const good = vi.fn();
    const offBad = await subscribeServerEvents("server-1", bad);
    const offGood = await subscribeServerEvents("server-1", good);

    dispatch!(CHANNEL, JSON.stringify({ i: "other", e: "finish", a: [] }));

    expect(good).toHaveBeenCalled();
    offBad();
    offGood();
  });
});
