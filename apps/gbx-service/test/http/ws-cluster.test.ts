import {
  sessionClaimsSchema,
  signWsTicket,
  type LiveSnapshot,
  type SessionClaims,
} from "@tmcontrolpanel/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { ClusterGateway } from "../../src/core/cluster/cluster-gateway";
import { clusterKeys } from "../../src/core/cluster/protocol";
import { WorkerNode } from "../../src/core/cluster/worker-node";
import { systemClock } from "../../src/core/ports";
import { ServerRegistry } from "../../src/core/server/server-registry";
import { buildApp } from "../../src/http/app";
import { TicketVerifier } from "../../src/http/ws/ticket-verifier";
import { flush } from "../fakes/clock";
import { MemoryClusterStore } from "../fakes/cluster-store";
import { createHarness, player, SERVER_ID } from "../fakes/harness";
import { silentLogger } from "../fakes/logger";

const SERVICE_TOKEN = "service-token-".padEnd(40, "x");
const TICKET_SECRET = "ticket-secret-".padEnd(40, "y");
const moderator = {
  servers: [{ id: SERVER_ID, name: "Test Server", role: "Moderator" as const }],
};
const ticketFor = (overrides: Partial<SessionClaims> = moderator) =>
  signWsTicket(
    sessionClaimsSchema.parse({ id: "user-1", admin: false, ...overrides }),
    TICKET_SECRET,
  );

type Message = { type: string; data: unknown };
const sockets: WebSocket[] = [];
const stops: (() => Promise<unknown>)[] = [];

afterEach(async () => {
  sockets.splice(0).forEach((socket) => socket.terminate());
  for (const stop of stops.splice(0)) await stop();
  vi.restoreAllMocks();
});

function connect(url: string) {
  const socket = new WebSocket(url);
  sockets.push(socket);
  const messages: Message[] = [];
  socket.on("message", (raw) => messages.push(JSON.parse(String(raw))));
  const closed = new Promise<number>((resolve) =>
    socket.once("close", resolve),
  );
  let read = 0;
  return {
    socket,
    messages,
    closed,
    async next() {
      await vi.waitFor(() => expect(messages.length).toBeGreaterThan(read), {
        timeout: 2000,
      });
      return messages[read++];
    },
  };
}

async function setup(available = true) {
  const h = await createHarness({ connect: false, players: [player("p1")] });
  const store = new MemoryClusterStore(systemClock);
  const registry = new ServerRegistry({
    servers: h.servers,
    createRuntime: () => h.runtime,
    log: silentLogger,
  });
  const gateway = new ClusterGateway({
    frontId: "front-ws",
    store,
    clock: systemClock,
    log: silentLogger,
  });
  const worker = new WorkerNode({
    workerId: "worker-ws",
    registry,
    store,
    listServers: () => h.servers.listActiveIds(),
    clock: h.clock,
    log: silentLogger,
    ttlMs: 15000,
  });
  await gateway.start();
  await worker.start();
  if (available) {
    await worker.ownership.claimSoon();
    await flush();
  }
  const app: FastifyInstance = await buildApp({
    gateway,
    log: silentLogger,
    serviceToken: SERVICE_TOKEN,
    tickets: new TicketVerifier(TICKET_SECRET, systemClock),
  });
  stops.push(
    () => app.close(),
    () => gateway.stop(),
    () => worker.stop(),
  );
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  if (!address || typeof address === "string")
    throw new Error("Expected TCP listener");
  return { h, store, gateway, worker, base: `ws://127.0.0.1:${address.port}` };
}

describe("WebSocket channels over ClusterGateway", () => {
  it("sends the player snapshot before live events from the worker", async () => {
    const { h, base } = await setup();
    const connection = connect(
      `${base}/ws/players/${SERVER_ID}?ticket=${await ticketFor()}`,
    );
    expect(await connection.next()).toEqual({
      type: "playerList",
      data: h.runtime.snapshot().activePlayers,
    });
    await h.callback("ManiaPlanet.PlayerDisconnect", ["p1", ""]);
    expect(await connection.next()).toEqual({
      type: "playerDisconnect",
      data: { login: "p1" },
    });
  });

  it("buffers subscribed events until the slow snapshot reply arrives", async () => {
    const { h, base } = await setup();
    const snapshot = h.runtime.snapshot();
    let resolve!: (snapshot: LiveSnapshot) => void;
    const deferred = new Promise<LiveSnapshot>((done) => {
      resolve = done;
    });
    // RPC awaits operations, so a deferred snapshot models a slow worker reply.
    const snapshotCall = vi
      .spyOn(h.runtime, "snapshot")
      .mockReturnValueOnce(deferred as unknown as LiveSnapshot);
    const connection = connect(
      `${base}/ws/players/${SERVER_ID}?ticket=${await ticketFor()}`,
    );
    await vi.waitFor(() => expect(snapshotCall).toHaveBeenCalledOnce());
    h.runtime.events.emit("playerDisconnect", "p1");
    await flush();
    expect(connection.messages).toEqual([]);
    resolve(snapshot);
    expect(await connection.next()).toEqual({
      type: "playerList",
      data: snapshot.activePlayers,
    });
    expect(await connection.next()).toEqual({
      type: "playerDisconnect",
      data: { login: "p1" },
    });
  });

  it("keeps the socket open without an owner and syncs when a worker takes ownership", async () => {
    const { h, worker, gateway, base } = await setup(false);
    const connection = connect(
      `${base}/ws/players/${SERVER_ID}?ticket=${await ticketFor()}`,
    );
    await vi.waitFor(() =>
      expect(gateway.events.listenerCount("owned")).toBe(1),
    );
    expect(connection.socket.readyState).toBe(WebSocket.OPEN);
    expect(connection.messages).toEqual([]);
    const snapshotCall = vi.spyOn(h.runtime, "snapshot");
    await worker.ownership.claimSoon();
    await flush();
    expect(snapshotCall).toHaveBeenCalledOnce();
    expect(await connection.next()).toEqual({
      type: "playerList",
      data: snapshotCall.mock.results[0].value.activePlayers,
    });
  });

  it("fetches a fresh snapshot on a subsequent owned event", async () => {
    const { h, store, gateway, base } = await setup();
    const connection = connect(
      `${base}/ws/players/${SERVER_ID}?ticket=${await ticketFor()}`,
    );
    await connection.next();
    await vi.waitFor(() =>
      expect(gateway.events.listenerCount("owned")).toBe(1),
    );
    vi.spyOn(h.runtime, "snapshot").mockReturnValue({
      ...h.runtime.snapshot(),
      activePlayers: [],
    });
    await store.publish(
      clusterKeys.globalEvents,
      JSON.stringify({
        event: "owned",
        serverId: SERVER_ID,
        workerId: "worker-ws",
      }),
    );
    expect(await connection.next()).toEqual({ type: "playerList", data: [] });
  });

  it("closes the socket with 1001 when the server is removed", async () => {
    const { store, gateway, base } = await setup();
    const connection = connect(
      `${base}/ws/players/${SERVER_ID}?ticket=${await ticketFor()}`,
    );
    await connection.next();
    await vi.waitFor(() =>
      expect(gateway.events.listenerCount("removed")).toBe(1),
    );
    await store.publish(
      clusterKeys.globalEvents,
      JSON.stringify({
        event: "removed",
        serverId: SERVER_ID,
        workerId: "worker-ws",
      }),
    );
    expect(await connection.closed).toBe(1001);
  });

  it("reports server connectivity from the shared status store", async () => {
    const { h, store, base } = await setup();
    expect(h.runtime.status().isConnected).toBe(true);
    await store.writeStatus(
      { ...h.runtime.status(), isConnected: false },
      15000,
    );
    const connection = connect(
      `${base}/ws/servers?ticket=${await ticketFor({
        groups: [
          {
            id: "g",
            name: "Group",
            role: "Member",
            servers: [
              { id: SERVER_ID, name: "Test Server" },
              { id: "missing", name: "Missing" },
            ],
          },
        ],
      })}`,
    );
    expect(await connection.next()).toEqual({
      type: "servers",
      data: [
        {
          id: SERVER_ID,
          name: "Test Server",
          hasFileManager: false,
          isConnected: false,
        },
        {
          id: "missing",
          name: "Missing",
          hasFileManager: false,
          isConnected: false,
        },
      ],
    });
    await store.writeStatus(
      { ...h.runtime.status(), isConnected: true },
      15000,
    );
    const connected = connect(
      `${base}/ws/servers?ticket=${await ticketFor({ groups: [{ id: "g", name: "Group", role: "Member", servers: [{ id: SERVER_ID, name: "Test Server" }] }] })}`,
    );
    expect(await connected.next()).toEqual({
      type: "servers",
      data: [
        {
          id: SERVER_ID,
          name: "Test Server",
          hasFileManager: false,
          isConnected: true,
        },
      ],
    });
  });
});
