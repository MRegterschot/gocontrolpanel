import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OwnershipManager,
  type OwnershipOptions,
} from "../../src/core/cluster/ownership";
import { clusterKeys } from "../../src/core/cluster/protocol";
import { FakeClock, flush } from "../fakes/clock";
import { MemoryClusterStore } from "../fakes/cluster-store";
import { silentLogger } from "../fakes/logger";

describe("OwnershipManager", () => {
  let clock: FakeClock;
  let store: MemoryClusterStore;
  const managers: OwnershipManager[] = [];

  function setup() {
    clock = new FakeClock();
    store = new MemoryClusterStore(clock);
  }
  function manager(
    workerId: string,
    servers = ["s1", "s2", "s3"],
    overrides: Partial<OwnershipOptions> = {},
  ) {
    const onOwned = vi.fn();
    const onLost = vi.fn(async () => {});
    const node = new OwnershipManager({
      store,
      workerId,
      clock,
      log: silentLogger,
      ttlMs: 15000,
      claimIntervalMs: 3000,
      listServers: async () => servers,
      isEligible: () => true,
      playerCount: () => 0,
      onOwned,
      onLost,
      random: () => 0.999,
      ...overrides,
    });
    managers.push(node);
    return { node, onOwned, onLost };
  }
  afterEach(async () => {
    store.down = false;
    await Promise.all(managers.splice(0).map((node) => node.stop()));
  });

  it("waits one claim interval and claims only its rounded-up fair share", async () => {
    setup();
    await store.heartbeat("b", 15000);
    const { node, onOwned } = manager("a");
    await node.start();
    await clock.advance(2999);
    expect(onOwned).not.toHaveBeenCalled();
    await clock.advance(1);
    expect(node.ownedIds()).toEqual(["s1", "s2"]);
    expect(await store.owners([clusterKeys.lease("s3")])).toEqual([null]);
  });

  it("covers all servers without overlapping ownership across two workers", async () => {
    setup();
    const a = manager("a").node;
    const b = manager("b").node;
    await Promise.all([a.start(), b.start()]);
    await clock.advance(3000);
    const owned = [...a.ownedIds(), ...b.ownedIds()];
    expect(owned.sort()).toEqual(["s1", "s2", "s3"]);
    expect(new Set(owned).size).toBe(owned.length);
    expect(await store.owners(a.ownedIds().map(clusterKeys.lease))).toEqual(
      a.ownedIds().map(() => "a"),
    );
    expect(await store.owners(b.ownedIds().map(clusterKeys.lease))).toEqual(
      b.ownedIds().map(() => "b"),
    );
  });

  it("reports lost when renewal finds a different owner", async () => {
    setup();
    const { node, onLost } = manager("a", ["s1"]);
    await node.start();
    await clock.advance(3000);
    await store.release(clusterKeys.lease("s1"), "a");
    await store.claim(clusterKeys.lease("s1"), "b", 15000);
    await clock.advance(2000);
    expect(onLost).toHaveBeenCalledWith("s1", "lost");
    expect(node.owns("s1")).toBe(false);
  });

  it("fences an outage by ttl minus the margin, while the lease still excludes others", async () => {
    setup();
    const { node, onLost } = manager("a", ["s1"]);
    await node.start();
    await clock.advance(5000);
    const lastRenewal = clock.now();
    store.down = true;
    await clock.advance(11999);
    expect(onLost).not.toHaveBeenCalled();
    await clock.advance(1);
    await flush();
    expect(onLost).toHaveBeenCalledWith("s1", "overdue");
    expect(clock.now() - lastRenewal).toBe(12000);
    store.down = false;
    expect(await store.claim(clusterKeys.lease("s1"), "b", 15000)).toBe(false);
  });

  it("stops every runtime before releasing leases and drops its heartbeat", async () => {
    setup();
    const { node, onLost } = manager("a");
    await node.start();
    await clock.advance(3000);
    onLost.mockImplementation(async () => {
      expect(await store.claim(clusterKeys.lease("s1"), "b", 15000)).toBe(
        false,
      );
    });
    await node.stop();
    expect(onLost.mock.calls).toEqual([
      ["s1", "shutdown"],
      ["s2", "shutdown"],
      ["s3", "shutdown"],
    ]);
    expect(await store.liveWorkers()).toEqual([]);
    const b = manager("b").node;
    await b.start();
    await b.claimSoon();
    expect(b.ownedIds()).toHaveLength(3);
  });

  it("hands one idle server to a new worker and respects the release cooldown", async () => {
    setup();
    const a = manager("a", undefined, { rebalanceIntervalMs: 12000 });
    await a.node.start();
    await clock.advance(3000);
    const b = manager("b", undefined, { rebalanceIntervalMs: 12000 });
    await b.node.start();
    await clock.advance(8999);
    expect(a.node.ownedIds()).toHaveLength(3);
    expect(b.node.ownedIds()).toHaveLength(0);
    await clock.advance(1);
    expect(a.onLost).toHaveBeenCalledExactlyOnceWith("s1", "released");
    expect(b.node.ownedIds()).toEqual(["s1"]);
    await b.node.stop();
    await a.node.claimSoon();
    expect(a.node.owns("s1")).toBe(false);
    await clock.advance(3000);
    expect(a.node.owns("s1")).toBe(false);
  });

  it("never rebalances servers with players", async () => {
    setup();
    const a = manager("a", undefined, {
      rebalanceIntervalMs: 12000,
      playerCount: () => 1,
    });
    await a.node.start();
    await clock.advance(3000);
    const b = manager("b");
    await b.node.start();
    await clock.advance(12000);
    expect(a.node.ownedIds()).toHaveLength(3);
    expect(a.onLost).not.toHaveBeenCalled();
    expect(b.node.ownedIds()).toEqual([]);
  });

  it("releases removed servers and never claims ineligible servers", async () => {
    setup();
    let servers = ["s1", "s2"];
    const { node, onLost } = manager("a", [], {
      listServers: async () => servers,
      isEligible: (id) => id !== "s2",
    });
    await node.start();
    await clock.advance(3000);
    expect(node.ownedIds()).toEqual(["s1"]);
    expect(await store.owners([clusterKeys.lease("s2")])).toEqual([null]);
    servers = ["s2"];
    await clock.advance(3000);
    expect(onLost).toHaveBeenCalledWith("s1", "removed");
    expect(await store.owners([clusterKeys.lease("s1")])).toEqual([null]);
  });
});
