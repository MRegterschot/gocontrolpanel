import {
  encodeServerLifecycleEvent,
  SERVER_EVENTS_CHANNEL,
} from "@tmcontrolpanel/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clusterKeys,
  RELEASE_OP,
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
    expect(dispose).toHaveBeenCalledWith(
      "Server removed from TMControlPanel, chat commands and widgets are now off",
    );
    expect(await store.owners([clusterKeys.lastOwner(SERVER_ID)])).toEqual([
      null,
    ]);
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
  it.each([true, false])("handles release RPC ownership=%s", async (owned) => {
    const { h, store, registry, worker, workerId } = await setup();
    if (owned) await worker.ownership.claimSoon();
    const dispose = vi.spyOn(h.runtime, "dispose");
    const replies: RpcReply[] = [];
    await store.subscribe("release:reply", (raw) =>
      replies.push(JSON.parse(raw)),
    );
    await store.publish(
      clusterKeys.rpc(workerId),
      JSON.stringify({
        id: "release",
        op: RELEASE_OP,
        serverId: SERVER_ID,
        args: null,
        replyTo: "release:reply",
      }),
    );
    await flush();
    expect(replies).toEqual([
      expect.objectContaining(
        owned
          ? { id: "release", ok: true }
          : { id: "release", ok: false, notOwner: true },
      ),
    ]);
    expect(dispose).toHaveBeenCalledTimes(owned ? 1 : 0);
    expect(registry.find(SERVER_ID)).toBeUndefined();
    expect(await store.owners([clusterKeys.lease(SERVER_ID)])).toEqual([null]);
  });

  it("claims an assignment immediately on a control message", async () => {
    const { store, worker, workerId } = await setup();
    await store.setFlag(clusterKeys.assign(SERVER_ID), workerId, 15000);
    expect(worker.ownership.owns(SERVER_ID)).toBe(false);
    await store.publish(
      clusterKeys.control,
      JSON.stringify({ action: "claim" }),
    );
    await flush();
    expect(worker.ownership.owns(SERVER_ID)).toBe(true);
    expect(await store.owners([clusterKeys.assign(SERVER_ID)])).toEqual([null]);
  });
});

describe("WorkerNode takeovers", () => {
  it.each(["move", "hold", "crash", "shutdown", "same"] as const)(
    "handles %s",
    async (scenario) => {
      const a = await createHarness({ connect: false });
      const b = await createHarness({ connect: false });
      const store = new MemoryClusterStore(a.clock);
      const messages: Record<string, unknown>[] = [];
      await store.subscribe(clusterKeys.globalEvents, (raw) =>
        messages.push(JSON.parse(raw)),
      );
      const make = (h: typeof a, workerId: string) =>
        new WorkerNode({
          workerId,
          store,
          registry: new ServerRegistry({
            servers: h.servers,
            createRuntime: () => h.runtime,
            log: silentLogger,
          }),
          listServers: () => h.servers.listActiveIds(),
          clock: h.clock,
          log: silentLogger,
          ttlMs: 15000,
        });
      const first = make(a, "a");
      const second = make(b, scenario === "same" ? "a" : "b");
      await first.start();
      await first.ownership.claimSoon();
      await flush();
      expect(messages.filter((m) => m.event === "handover")).toEqual([]);
      try {
        if (scenario === "shutdown" || scenario === "same") await first.stop();
        else if (scenario === "crash") await store.releaseServersOwnedBy("a");
        else {
          await store.publish(
            clusterKeys.rpc("a"),
            JSON.stringify({
              id: "release",
              op: "release",
              serverId: SERVER_ID,
              args: { reason: scenario },
              replyTo: "reply",
            }),
          );
          await flush();
          expect(await store.owners([clusterKeys.handover(SERVER_ID)])).toEqual(
            [scenario],
          );
        }
        await second.start();
        await second.ownership.claimSoon();
        await flush();
        const handovers = messages.filter((m) => m.event === "handover");
        if (scenario === "same") expect(handovers).toEqual([]);
        else
          expect(handovers).toEqual([
            {
              event: "handover",
              serverId: SERVER_ID,
              workerId: "b",
              previous: "a",
              kind: {
                move: "moved",
                hold: "resumed",
                crash: "crashed",
                shutdown: "restarted",
              }[scenario],
            },
          ]);
        expect(
          await store.owners([
            clusterKeys.lastOwner(SERVER_ID),
            clusterKeys.handover(SERVER_ID),
          ]),
        ).toEqual([scenario === "same" ? "a" : "b", null]);
        const chat = b.session
          .callsTo("ChatSendServerMessage")
          .map((c) => c.params[0]);
        if (scenario === "hold")
          expect(chat).toEqual(["$<$0cfTMControlPanel$>: Connected."]);
        if (scenario === "move") {
          expect(chat.join(" ")).toMatch(/Moved here from .+ by an admin\./);
          expect(
            a.session.callsTo("ChatSendServerMessage").map((c) => c.params[0]),
          ).toContain(
            "$<$0cfTMControlPanel$>: Disconnecting: An admin is moving this server to another worker, back in a few seconds",
          );
        }
      } finally {
        await second.stop();
        await first.stop();
      }
    },
  );
});
