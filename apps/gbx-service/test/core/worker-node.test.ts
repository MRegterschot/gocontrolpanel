import {
  encodeServerLifecycleEvent,
  SERVER_EVENTS_CHANNEL,
} from "@tmcontrolpanel/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clusterKeys,
  type RpcReply,
  type RpcRequest,
} from "../../src/core/cluster/protocol";
import { WorkerNode } from "../../src/core/cluster/worker-node";
import { AppError } from "../../src/core/errors";
import { ServerRegistry } from "../../src/core/server/server-registry";
import { flush } from "../fakes/clock";
import { MemoryClusterStore } from "../fakes/cluster-store";
import { createHarness, SERVER_ID } from "../fakes/harness";
import { silentLogger } from "../fakes/logger";

describe("WorkerNode", () => {
  const stops: (() => Promise<void>)[] = [];
  afterEach(async () => {
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
    const workerId = "worker-a";
    const worker = new WorkerNode({
      workerId,
      registry,
      store,
      listServers: () => h.servers.listActiveIds(),
      clock: h.clock,
      log: silentLogger,
      ttlMs: 15000,
      claimIntervalMs: 3000,
    });
    stops.push(() => worker.stop());
    await worker.start();
    return { h, store, registry, worker, workerId };
  }

  it("replies to status RPCs after claiming a server", async () => {
    const { h, store, workerId } = await setup();
    await h.clock.advance(3000);
    const replies: RpcReply[] = [];
    await store.subscribe("test:reply", (raw) => replies.push(JSON.parse(raw)));
    const request: RpcRequest = {
      id: "request-1",
      op: "status",
      serverId: SERVER_ID,
      args: null,
      replyTo: "test:reply",
    };
    await store.publish(clusterKeys.rpc(workerId), JSON.stringify(request));
    await flush();
    expect(replies).toEqual([
      { id: request.id, ok: true, data: h.runtime.status() },
    ]);
  });

  it("marks an unknown server as unavailable and safe to retry", async () => {
    const { h, store, workerId } = await setup();
    await h.clock.advance(3000);
    const replies: RpcReply[] = [];
    await store.subscribe("test:reply", (raw) => replies.push(JSON.parse(raw)));
    await store.publish(
      clusterKeys.rpc(workerId),
      JSON.stringify({
        id: "unknown",
        op: "status",
        serverId: "missing",
        args: null,
        replyTo: "test:reply",
      }),
    );
    await flush();
    expect(replies).toEqual([
      expect.objectContaining({
        id: "unknown",
        ok: false,
        code: "ServerUnavailable",
        notOwner: true,
      }),
    ]);
  });

  it("preserves the code of an AppError thrown by an operation", async () => {
    const { h, store, workerId } = await setup();
    await h.clock.advance(3000);
    vi.spyOn(h.runtime, "snapshot").mockImplementation(() => {
      throw new AppError("ServerNotConnected", "Disconnected");
    });
    const replies: RpcReply[] = [];
    await store.subscribe("test:reply", (raw) => replies.push(JSON.parse(raw)));
    await store.publish(
      clusterKeys.rpc(workerId),
      JSON.stringify({
        id: "failure",
        op: "snapshot",
        serverId: SERVER_ID,
        args: null,
        replyTo: "test:reply",
      }),
    );
    await flush();
    expect(replies).toEqual([
      {
        id: "failure",
        ok: false,
        code: "ServerNotConnected",
        message: "Disconnected",
      },
    ]);
  });

  it("forwards runtime events to the server event channel", async () => {
    const { h, store } = await setup();
    await h.clock.advance(3000);
    const messages: unknown[] = [];
    await store.subscribe(clusterKeys.serverEvents(SERVER_ID), (raw) =>
      messages.push(JSON.parse(raw)),
    );
    h.runtime.events.emit("playerList", []);
    await flush();
    expect(messages).toEqual([{ event: "playerList", args: [[]] }]);
  });

  it("publishes ownership and disposes the runtime on a server.deleted lifecycle event", async () => {
    const { h, store, registry, worker, workerId } = await setup();
    const messages: unknown[] = [];
    await store.subscribe(clusterKeys.globalEvents, (raw) =>
      messages.push(JSON.parse(raw)),
    );
    const dispose = vi.spyOn(h.runtime, "dispose");
    await h.clock.advance(3000);
    expect(messages).toContainEqual({
      event: "owned",
      serverId: SERVER_ID,
      workerId,
    });
    expect(registry.find(SERVER_ID)).toBe(h.runtime);
    await store.publish(
      SERVER_EVENTS_CHANNEL,
      encodeServerLifecycleEvent({
        type: "server.deleted",
        serverId: SERVER_ID,
      }),
    );
    await flush();
    expect(dispose).toHaveBeenCalledOnce();
    expect(registry.find(SERVER_ID)).toBeUndefined();
    expect(worker.ownership.owns(SERVER_ID)).toBe(false);
    expect(messages).toContainEqual({
      event: "removed",
      serverId: SERVER_ID,
      workerId,
    });
    expect(await store.readStatus(SERVER_ID)).toBeNull();
    expect(await store.owners([clusterKeys.lease(SERVER_ID)])).toEqual([null]);
    const forwarded: string[] = [];
    await store.subscribe(clusterKeys.serverEvents(SERVER_ID), (raw) =>
      forwarded.push(raw),
    );
    h.runtime.events.emit("playerList", []);
    await flush();
    expect(forwarded).toEqual([]);
  });
});
