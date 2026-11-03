import {
  encodeServerLifecycleEvent,
  SERVER_EVENTS_CHANNEL,
} from "@tmcontrolpanel/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClusterGateway } from "../../src/core/cluster/cluster-gateway";
import { clusterKeys, type RpcRequest } from "../../src/core/cluster/protocol";
import { WorkerNode } from "../../src/core/cluster/worker-node";
import { AppError } from "../../src/core/errors";
import { ServerRegistry } from "../../src/core/server/server-registry";
import { flush } from "../fakes/clock";
import { MemoryClusterStore } from "../fakes/cluster-store";
import { createHarness, SERVER_ID } from "../fakes/harness";
import { silentLogger } from "../fakes/logger";

describe("ClusterGateway", () => {
  const stops: (() => Promise<void>)[] = [];
  afterEach(async () => {
    vi.restoreAllMocks();
    for (const stop of stops.splice(0)) await stop();
  });

  async function setup() {
    const h = await createHarness({ connect: false });
    const store = new MemoryClusterStore(h.clock);
    const registry = new ServerRegistry({
      servers: h.servers,
      createRuntime: () => h.runtime,
      log: silentLogger,
    });
    const worker = new WorkerNode({
      workerId: "worker-a",
      registry,
      store,
      listServers: () => h.servers.listActiveIds(),
      clock: h.clock,
      log: silentLogger,
      ttlMs: 15000,
    });
    const gateway = new ClusterGateway({
      frontId: "front-a",
      store,
      clock: h.clock,
      log: silentLogger,
      timeoutMs: () => 1000,
    });
    await gateway.start();
    await worker.start();
    await worker.ownership.claimSoon();
    await flush();
    stops.push(
      () => gateway.stop(),
      () => worker.stop(),
    );
    return { h, store, gateway, worker };
  }

  it("emits global handovers", async () => {
    const { store, gateway } = await setup();
    const received = vi.fn();
    gateway.events.on("handover", received);
    const data = {
      serverId: SERVER_ID,
      kind: "moved",
      workerId: "b",
      previous: "a",
    };
    await store.publish(
      clusterKeys.globalEvents,
      JSON.stringify({ event: "handover", ...data }),
    );
    await flush();
    expect(received).toHaveBeenCalledWith(data);
  });

  it.each(["move", "hold"] as const)(
    "passes %s to release RPC",
    async (action) => {
      const { store, gateway } = await setup();
      await store.heartbeat("target", 15000);
      const publish = vi.spyOn(store, "publish");
      await gateway.control(
        action === "move"
          ? { action, serverId: SERVER_ID, workerId: "target" }
          : { action, serverId: SERVER_ID },
      );
      const requests = publish.mock.calls
        .filter(([channel]) => channel === clusterKeys.rpc("worker-a"))
        .map(([, raw]) => JSON.parse(raw));
      expect(requests).toContainEqual(
        expect.objectContaining({ op: "release", args: { reason: action } }),
      );
    },
  );

  it("returns status from the owning worker", async () => {
    const { h, gateway } = await setup();
    expect(await gateway.call(SERVER_ID, "status")).toEqual(h.runtime.status());
  });

  it("rejects when no worker owns the server", async () => {
    const { gateway } = await setup();
    await expect(gateway.call("missing", "status")).rejects.toMatchObject({
      code: "ServerUnavailable",
    });
  });

  it("looks up an unreachable owner only twice", async () => {
    const { store, gateway } = await setup();
    await store.claim(clusterKeys.lease("missing"), "ghost", 15000);
    const owners = vi.spyOn(store, "owners");
    const publish = vi.spyOn(store, "publish");
    await expect(gateway.call("missing", "status")).rejects.toMatchObject({
      code: "ServerUnavailable",
    });
    expect(owners).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls.map(([channel]) => channel)).toEqual([
      clusterKeys.rpc("ghost"),
      clusterKeys.rpc("ghost"),
    ]);
  });

  it("finds a live owner on the second lookup after an undelivered request", async () => {
    const { h, store, gateway } = await setup();
    const owners = vi.spyOn(store, "owners").mockResolvedValueOnce(["ghost"]);
    expect(await gateway.call(SERVER_ID, "status")).toEqual(h.runtime.status());
    expect(owners).toHaveBeenCalledTimes(2);
  });

  it("retries a notOwner reply against the new owner", async () => {
    const { h, store, gateway } = await setup();
    await store.subscribe(clusterKeys.rpc("stale"), (raw) => {
      const request: RpcRequest = JSON.parse(raw);
      void store.publish(
        request.replyTo,
        JSON.stringify({
          id: request.id,
          ok: false,
          code: "ServerUnavailable",
          message: "Moved",
          notOwner: true,
        }),
      );
    });
    const owners = vi.spyOn(store, "owners").mockResolvedValueOnce(["stale"]);
    expect(await gateway.call(SERVER_ID, "status")).toEqual(h.runtime.status());
    expect(owners).toHaveBeenCalledTimes(2);
  });

  it("stops retrying after a second notOwner reply", async () => {
    const { store, gateway } = await setup();
    await store.subscribe(clusterKeys.rpc("stale"), (raw) => {
      const request: RpcRequest = JSON.parse(raw);
      void store.publish(
        request.replyTo,
        JSON.stringify({
          id: request.id,
          ok: false,
          code: "ServerUnavailable",
          message: "Moved",
          notOwner: true,
        }),
      );
    });
    const owners = vi.spyOn(store, "owners").mockResolvedValue(["stale"]);
    await expect(gateway.call(SERVER_ID, "status")).rejects.toMatchObject({
      code: "ServerUnavailable",
    });
    expect(owners).toHaveBeenCalledTimes(2);
  });

  it("preserves operation AppError codes without retrying", async () => {
    const { h, store, gateway } = await setup();
    vi.spyOn(h.runtime, "snapshot").mockImplementation(() => {
      throw new AppError("ServerNotConnected", "Disconnected");
    });
    const owners = vi.spyOn(store, "owners");
    await expect(gateway.call(SERVER_ID, "snapshot")).rejects.toMatchObject({
      code: "ServerNotConnected",
    });
    expect(owners).toHaveBeenCalledTimes(1);
  });

  it("times out an RPC whose subscriber never replies", async () => {
    const { h, store, gateway } = await setup();
    await store.claim(clusterKeys.lease("silent"), "silent-worker", 15000);
    await store.subscribe(clusterKeys.rpc("silent-worker"), () => {});
    const result = expect(
      gateway.call("silent", "status"),
    ).rejects.toMatchObject({ code: "UpstreamError" });
    await flush();
    await h.clock.advance(1001);
    await result;
  });

  it("forwards global events and translates released into disconnect", async () => {
    const { store, gateway } = await setup();
    const received: unknown[] = [];
    for (const event of [
      "connect",
      "owned",
      "removed",
      "disconnect",
    ] as const) {
      gateway.events.on(event, (id) => received.push([event, id]));
    }
    for (const event of ["connect", "owned", "removed", "released"]) {
      await store.publish(
        clusterKeys.globalEvents,
        JSON.stringify({ event, serverId: SERVER_ID, workerId: "worker-a" }),
      );
    }
    await flush();
    expect(received).toEqual([
      ["connect", SERVER_ID],
      ["owned", SERVER_ID],
      ["removed", SERVER_ID],
      ["disconnect", SERVER_ID],
    ]);
  });

  it("publishes lifecycle events on the shared lifecycle channel", async () => {
    const { store, gateway } = await setup();
    const messages: string[] = [];
    await store.subscribe(SERVER_EVENTS_CHANNEL, (raw) => messages.push(raw));
    const event = {
      type: "server.plugins.updated",
      serverId: "missing",
    } as const;
    await gateway.handleLifecycleEvent(event);
    await flush();
    expect(messages).toEqual([encodeServerLifecycleEvent(event)]);
  });

  it("requires a reachable store and a worker heartbeat for healthy status", async () => {
    const { h, store, gateway } = await setup();
    await store.writeStatus(
      { ...h.runtime.status(), isConnected: true },
      15000,
    );
    expect(await gateway.health()).toEqual({
      ok: true,
      servers: 1,
      connected: 1,
      workers: 1,
    });
    await store.dropWorker("worker-a");
    expect(await gateway.health()).toMatchObject({ ok: false, workers: 0 });
    await store.heartbeat("worker-a", 15000);
    vi.spyOn(store, "ping").mockResolvedValue(false);
    expect(await gateway.health()).toMatchObject({ ok: false, workers: 1 });
    vi.spyOn(store, "ping").mockRejectedValue(new Error("Offline"));
    expect(await gateway.health()).toEqual({
      ok: false,
      servers: 0,
      connected: 0,
      workers: 0,
    });
  });
  it("merges worker metadata, leases, statuses and unleased holds", async () => {
    const { h, store, gateway } = await setup();
    await store.heartbeat("node-b:1", 15000);
    await store.heartbeat("node-c:1", 15000, {
      nodeId: "node-c",
      pid: 42,
      startedAt: 100,
    });
    await store.setFlag(clusterKeys.hold("parked"), "front");
    await store.setFlag(clusterKeys.hold(SERVER_ID), "front");
    const overview = await gateway.overview();
    expect(overview.workers).toContainEqual({
      id: "node-b:1",
      nodeId: "node-b",
      pid: null,
      startedAt: null,
      servers: [],
    });
    expect(overview.workers).toContainEqual({
      id: "node-c:1",
      nodeId: "node-c",
      pid: 42,
      startedAt: 100,
      servers: [],
    });
    expect(overview.servers).toContainEqual({
      serverId: SERVER_ID,
      owner: "worker-a",
      leaseTtlMs: 15000,
      held: true,
      status: h.runtime.status(),
    });
    expect(overview.servers).toContainEqual({
      serverId: "parked",
      owner: null,
      leaseTtlMs: null,
      held: true,
      status: null,
    });
  });

  it("moves through assignment, release and a claim wakeup", async () => {
    const { store, gateway, worker } = await setup();
    await store.heartbeat("target", 15000);
    const publish = vi.spyOn(store, "publish");
    const flag = vi.spyOn(store, "setFlag");
    await gateway.control({
      action: "move",
      serverId: SERVER_ID,
      workerId: "target",
    });
    expect(flag).toHaveBeenCalledWith(
      clusterKeys.assign(SERVER_ID),
      "target",
      expect.any(Number),
    );
    expect(publish).toHaveBeenCalledWith(
      clusterKeys.rpc("worker-a"),
      expect.stringContaining('"op":"release"'),
    );
    expect(publish).toHaveBeenCalledWith(
      clusterKeys.control,
      JSON.stringify({ action: "claim" }),
    );
    expect(worker.ownership.owns(SERVER_ID)).toBe(false);
    expect(await store.owners([clusterKeys.assign(SERVER_ID)])).toEqual([
      "target",
    ]);
  });

  it("validates moves and leaves an existing placement alone", async () => {
    const { store, gateway } = await setup();
    const publish = vi.spyOn(store, "publish");
    await gateway.control({
      action: "move",
      serverId: SERVER_ID,
      workerId: "worker-a",
    });
    expect(publish).not.toHaveBeenCalled();
    await expect(
      gateway.control({
        action: "move",
        serverId: "free",
        workerId: "worker-a",
      }),
    ).rejects.toMatchObject({ code: "BadRequest" });
    await expect(
      gateway.control({
        action: "move",
        serverId: SERVER_ID,
        workerId: "missing",
      }),
    ).rejects.toMatchObject({ code: "NotFound" });
    await expect(
      gateway.control({ action: "claim", serverId: SERVER_ID }),
    ).rejects.toMatchObject({ code: "BadRequest" });
  });

  it("claims on the least loaded worker and clears the hold", async () => {
    const { store, gateway } = await setup();
    await store.heartbeat("empty", 15000);
    await store.setFlag(clusterKeys.hold("free"), "front");
    await gateway.control({ action: "claim", serverId: "free" });
    expect(
      await store.owners([
        clusterKeys.hold("free"),
        clusterKeys.assign("free"),
      ]),
    ).toEqual([null, "empty"]);
    await store.dropWorker("worker-a");
    await store.dropWorker("empty");
    await expect(
      gateway.control({ action: "claim", serverId: "other" }),
    ).rejects.toMatchObject({ code: "ServerUnavailable" });
  });

  it("holds owned, unowned and unreachable servers and wakes on unhold", async () => {
    const { store, gateway, worker } = await setup();
    await gateway.control({ action: "hold", serverId: SERVER_ID });
    expect(worker.ownership.owns(SERVER_ID)).toBe(false);
    await gateway.control({ action: "hold", serverId: "free" });
    await store.claim(clusterKeys.lease("ghost"), "gone", 15000);
    await gateway.control({ action: "hold", serverId: "ghost" });
    expect(await store.heldServers()).toEqual(
      expect.arrayContaining([SERVER_ID, "free", "ghost"]),
    );
    const publish = vi.spyOn(store, "publish");
    await gateway.control({ action: "unhold", serverId: "free" });
    expect(await store.owners([clusterKeys.hold("free")])).toEqual([null]);
    expect(publish).toHaveBeenCalledWith(
      clusterKeys.control,
      JSON.stringify({ action: "claim" }),
    );
  });

  it("publishes worker restarts only for live workers", async () => {
    const { store, gateway } = await setup();
    const publish = vi.spyOn(store, "publish");
    await gateway.control({ action: "restartWorker", workerId: "worker-a" });
    expect(publish).toHaveBeenCalledWith(
      clusterKeys.control,
      JSON.stringify({ action: "restartWorker", workerId: "worker-a" }),
    );
    await expect(
      gateway.control({ action: "restartWorker", workerId: "missing" }),
    ).rejects.toMatchObject({ code: "NotFound" });
  });
});
