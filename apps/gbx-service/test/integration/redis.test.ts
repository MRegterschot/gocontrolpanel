import { encodeServerLifecycleEvent, SERVER_EVENTS_CHANNEL, type ServerLifecycleEvent } from "@gcp/shared";
import type { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RedisCache } from "../../src/infra/redis/cache";
import { RedisJukeboxStore } from "../../src/infra/redis/jukebox-store";
import { subscribeToLifecycleEvents } from "../../src/infra/redis/lifecycle-subscriber";
import { RedisRateLimiter } from "../../src/infra/redis/rate-limiter";
import { createRedis } from "../../src/infra/redis/redis";
import { silentLogger } from "../fakes/logger";

const url = process.env.INTEGRATION_REDIS_URL;

describe.skipIf(!url)("Redis adapters", () => {
  let redis: Redis;

  beforeAll(async () => {
    redis = createRedis(url!);
    await redis.flushdb();
  });

  afterAll(() => redis.disconnect());

  it("peeks and pops the jukebox the web app writes", async () => {
    await redis.rpush("jukebox:s1", JSON.stringify({ fileName: "a.Map.Gbx" }), "not json");
    const store = new RedisJukeboxStore(redis);

    expect(await store.peek("s1")).toEqual({ fileName: "a.Map.Gbx" });
    await store.pop("s1");
    expect(await store.peek("s1")).toBeNull();
    expect(await store.peek("empty")).toBeNull();
  });

  it("caches values with a ttl", async () => {
    const cache = new RedisCache(redis);
    await cache.set("k", "v", 60);
    expect(await cache.get("k")).toBe("v");
    expect(await redis.ttl("k")).toBeGreaterThan(0);
  });

  it("delivers lifecycle events and ignores malformed ones", async () => {
    const subscriber = createRedis(url!);
    const received: ServerLifecycleEvent[] = [];
    const done = new Promise<void>((resolve) => {
      void subscribeToLifecycleEvents(
        subscriber,
        async (event) => {
          received.push(event);
          resolve();
        },
        silentLogger,
      ).then(async () => {
        await redis.publish(SERVER_EVENTS_CHANNEL, "garbage");
        await redis.publish(SERVER_EVENTS_CHANNEL, encodeServerLifecycleEvent({ type: "server.created", serverId: "s1" }));
      });
    });

    await done;
    expect(received).toEqual([{ type: "server.created", serverId: "s1" }]);
    subscriber.disconnect();
  });

  it("rate limits through the shared token bucket", async () => {
    const limiter = new RedisRateLimiter(redis);
    const results = await Promise.all(
      [1, 2, 3].map((n) => limiter.run("test", async () => n, { burst: 5, ratePerMinute: 600 })),
    );
    expect(results).toEqual([1, 2, 3]);
    expect(await redis.exists("rate:test")).toBe(1);
  });
});
