import type { ServerClient } from "@tmcontrolpanel/shared";
import type { Redis } from "ioredis";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clusterKeys } from "../../src/core/cluster/protocol";
import { RedisClusterStore } from "../../src/infra/redis/cluster-store";
import { createRedis } from "../../src/infra/redis/redis";
import { silentLogger } from "../fakes/logger";

const url = process.env.INTEGRATION_REDIS_URL;
const prefix = `cluster-test-${randomUUID()}`;
const id = (name: string) => `${prefix}-${name}`;
const status = (serverId: string): ServerClient => ({
  serverId,
  name: serverId,
  isConnected: true,
  isReconnecting: false,
  reconnectingAt: null,
});

describe.skipIf(!url)("RedisClusterStore", () => {
  let redis: Redis;
  let subscriber: Redis;
  let store: RedisClusterStore;
  beforeAll(async () => {
    redis = createRedis(url!, silentLogger, "cluster-test");
    subscriber = createRedis(url!, silentLogger, "cluster-test-subscriber");
    store = new RedisClusterStore(redis, subscriber);
    await redis.ping();
  });
  afterAll(async () => {
    try {
      let cursor = "0";
      do {
        const [next, keys] = await redis.scan(
          cursor,
          "MATCH",
          `*${prefix}*`,
          "COUNT",
          100,
        );
        cursor = next;
        if (keys.length) await redis.del(...keys);
      } while (cursor !== "0");
    } finally {
      redis.disconnect();
      subscriber.disconnect();
    }
  });

  it("lists heartbeat metadata, leases and persistent or expiring flags", async () => {
    const workerId = id("metadata");
    const info = { nodeId: "node", pid: 123, startedAt: 100 };
    await store.heartbeat(workerId, 15000, info);
    expect(await store.workers()).toContainEqual({ id: workerId, info });
    await store.heartbeat(workerId, 15000);
    expect(await store.workers()).toContainEqual({ id: workerId, info: null });
    const serverId = id("overview");
    await store.claim(clusterKeys.lease(serverId), workerId, 15000);
    expect(await store.leases()).toContainEqual({
      serverId,
      owner: workerId,
      ttlMs: expect.any(Number),
    });
    await store.setFlag(clusterKeys.hold(serverId), "1");
    expect(await redis.pttl(clusterKeys.hold(serverId))).toBe(-1);
    expect(await store.heldServers()).toContain(serverId);
    await store.setFlag(clusterKeys.assign(serverId), workerId, 15000);
    expect(await redis.pttl(clusterKeys.assign(serverId))).toBeGreaterThan(0);
    await store.deleteFlag(clusterKeys.hold(serverId));
    expect(await store.heldServers()).not.toContain(serverId);
  });

  it("claims exclusively with NX and exposes owners", async () => {
    const key = clusterKeys.lease(id("exclusive"));
    expect(
      await Promise.all([
        store.claim(key, "a", 15000),
        store.claim(key, "b", 15000),
      ]),
    ).toEqual([true, false]);
    expect(await store.owners([key, clusterKeys.lease(id("missing"))])).toEqual(
      ["a", null],
    );
    expect(await store.owners([])).toEqual([]);
    expect(await redis.pttl(key)).toBeGreaterThan(0);
  });

  it("renews and releases only for the matching owner, leaving status for separate cleanup", async () => {
    const serverId = id("renew");
    const key = clusterKeys.lease(serverId);
    await store.claim(key, "a", 15000);
    await store.writeStatus(status(serverId), 15000);
    expect(await store.renew(key, "b", 30000)).toBe(false);
    expect(await store.release(key, "b")).toBe(false);
    expect(await store.renew(key, "a", 30000)).toBe(true);
    expect(await redis.pttl(key)).toBeGreaterThan(15000);
    expect(await store.release(key, "a")).toBe(true);
    expect(await store.owners([key])).toEqual([null]);
    expect(await store.readStatus(serverId)).toEqual(status(serverId));
  });

  it("releases an owner's server leases and statuses while preserving other owners and singletons", async () => {
    const a = id("owner-a");
    const b = id("owner-b");
    const owner = id("worker-a");
    await store.claim(clusterKeys.lease(a), owner, 15000);
    await store.claim(clusterKeys.lease(b), id("worker-b"), 15000);
    await store.claim(clusterKeys.singleton(id("singleton")), owner, 15000);
    await store.writeStatus(status(a), 15000);
    await store.writeStatus(status(b), 15000);
    expect(await store.releaseServersOwnedBy(owner)).toEqual([a]);
    expect(await store.readStatus(a)).toBeNull();
    expect(await store.readStatus(b)).toEqual(status(b));
    expect(
      await store.owners([
        clusterKeys.lease(a),
        clusterKeys.lease(b),
        clusterKeys.singleton(id("singleton")),
      ]),
    ).toEqual([null, id("worker-b"), owner]);
  });

  it("ref-counts subscriptions and isolates throwing handlers", async () => {
    const channel = id("channel");
    const first: string[] = [];
    const second: string[] = [];
    const [stopFirst, stopSecond] = await Promise.all([
      store.subscribe(channel, (message) => {
        first.push(message);
        throw new Error("consumer failure");
      }),
      store.subscribe(channel, (message) => second.push(message)),
    ]);
    expect(await store.publish(channel, "one")).toBe(1);
    await expect.poll(() => second).toEqual(["one"]);
    expect(first).toEqual(["one"]);
    await stopFirst();
    await stopFirst();
    expect(await store.publish(channel, "two")).toBe(1);
    await expect.poll(() => second).toEqual(["one", "two"]);
    expect(first).toEqual(["one"]);
    await stopSecond();
    expect(await store.publish(channel, "three")).toBe(0);
  });

  it("lists statuses while skipping malformed values, and tracks worker heartbeats", async () => {
    const serverId = id("listed");
    await store.writeStatus(status(serverId), 15000);
    await redis.set(
      clusterKeys.status(id("malformed")),
      "not json",
      "PX",
      15000,
    );
    expect(await store.readStatus(id("malformed"))).toBeNull();
    expect(await store.readStatus(id("missing"))).toBeNull();
    expect(await store.listStatus()).toContainEqual(status(serverId));
    expect((await store.listStatus()).every((value) => value !== null)).toBe(
      true,
    );
    await store.dropStatus(serverId);
    expect(await store.readStatus(serverId)).toBeNull();
    await store.heartbeat(id("worker"), 15000);
    expect(await store.liveWorkers()).toContain(id("worker"));
    expect(await redis.pttl(clusterKeys.worker(id("worker")))).toBeGreaterThan(
      0,
    );
    await store.dropWorker(id("worker"));
    expect(await store.liveWorkers()).not.toContain(id("worker"));
    expect(await store.ping()).toBe(true);
  });
});
