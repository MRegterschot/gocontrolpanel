import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { TicketVerifier } from "../../src/http/ws/ticket-verifier";
import { flush } from "../fakes/clock";
import { player } from "../fakes/harness";
import { createApp, ticketFor } from "./app-fixture";

type Fixture = Awaited<ReturnType<typeof createApp>>;
let current: Fixture | null = null;
const sockets: WebSocket[] = [];

afterEach(async () => {
  sockets.forEach((socket) => socket.terminate());
  sockets.length = 0;
  await current?.app.close();
  current = null;
});

async function setup(options: Parameters<typeof createApp>[0] = {}) {
  current = await createApp(options);
  await current.app.listen({ port: 0, host: "127.0.0.1" });
  const address = current.app.server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { ...current, base: `ws://127.0.0.1:${port}` };
}

interface Connection {
  messages: { type: string; data: any }[];
  closed: Promise<number>;
  next(type?: string): Promise<{ type: string; data: any }>;
}

function connect(url: string, headers: Record<string, string> = {}): Connection {
  const socket = new WebSocket(url, { headers });
  sockets.push(socket);
  const messages: { type: string; data: any }[] = [];
  const waiters: (() => void)[] = [];
  socket.on("message", (raw) => {
    messages.push(JSON.parse(String(raw)));
    waiters.splice(0).forEach((wake) => wake());
  });
  const closed = new Promise<number>((resolve) => socket.on("close", (code) => resolve(code)));

  let read = 0;
  return {
    messages,
    closed,
    async next(type) {
      for (;;) {
        while (read < messages.length) {
          const message = messages[read++];
          if (!type || message.type === type) return message;
        }
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type ?? "message"}`)), 2000);
          waiters.push(() => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
    },
  };
}

const viewer = { servers: [{ id: "server-1", name: "Test Server", role: "Member" as const }] };

describe("ws connection rate limiting", () => {
  it("limits all channels before ticket verification and rejects upgrades with HTTP 429", async () => {
    const { app, base } = await setup();
    const verify = vi.spyOn(TicketVerifier.prototype, "verify");
    try {
      expect(
        await connect(`${base}/ws/live/server-1?ticket=garbage`).closed,
      ).toBe(4401);
      expect(verify).toHaveBeenCalledTimes(1);
      for (let attempt = 1; attempt < 120; attempt++) {
        const url = attempt % 2 === 0 ? "/ws/servers" : "/ws/live/server-1";
        expect(
          (await app.inject({ method: "GET", url, remoteAddress: "127.0.0.1" }))
            .statusCode,
        ).not.toBe(429);
      }
      const denied = await app.inject({
        method: "GET",
        url: "/ws/map/server-1",
        remoteAddress: "127.0.0.1",
        headers: { "x-forwarded-for": "192.0.2.1" },
      });
      expect(denied.statusCode).toBe(429);
      expect(Number(denied.headers["retry-after"])).toBeGreaterThan(0);
      const status = await new Promise<number>((resolve, reject) => {
        const socket = new WebSocket(`${base}/ws/servers?ticket=garbage`);
        socket.once("error", reject);
        socket.once("unexpected-response", (_request, response) => {
          resolve(response.statusCode!);
          response.resume();
          socket.terminate();
        });
      });
      expect(status).toBe(429);
      expect(verify).toHaveBeenCalledTimes(1);
      expect(
        (
          await app.inject({
            method: "GET",
            url: "/ws/servers",
            remoteAddress: "192.0.2.1",
          })
        ).statusCode,
      ).not.toBe(429);
      expect(
        (
          await app.inject({
            method: "GET",
            url: "/health",
            remoteAddress: "127.0.0.1",
          })
        ).statusCode,
      ).toBe(200);
    } finally {
      verify.mockRestore();
    }
  });

  it("allows new attempts after the rate limit window expires", async () => {
    const { app } = await setup();
    let now = Date.now();
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
    try {
      for (let attempt = 0; attempt < 120; attempt++) {
        await app.inject({ method: "GET", url: "/ws/servers" });
      }
      expect(
        (await app.inject({ method: "GET", url: "/ws/servers" })).statusCode,
      ).toBe(429);
      now += 60001;
      expect(
        (await app.inject({ method: "GET", url: "/ws/servers" })).statusCode,
      ).not.toBe(429);
    } finally {
      clock.mockRestore();
    }
  });
});

describe("ws authentication", () => {
  it("closes without a ticket", async () => {
    const { base } = await setup();
    expect(await connect(`${base}/ws/live/server-1`).closed).toBe(4401);
  });

  it("closes with an invalid ticket", async () => {
    const { base } = await setup();
    expect(await connect(`${base}/ws/live/server-1?ticket=garbage`).closed).toBe(4401);
  });

  it("refuses to reuse a ticket", async () => {
    const { base } = await setup();
    const ticket = await ticketFor(viewer);
    await connect(`${base}/ws/live/server-1?ticket=${ticket}`).next("beginMatch");
    expect(await connect(`${base}/ws/live/server-1?ticket=${ticket}`).closed).toBe(4401);
  });

  it("enforces the origin allowlist", async () => {
    const { base } = await setup({ allowedOrigins: ["https://panel.test"] });
    const bad = connect(`${base}/ws/servers?ticket=${await ticketFor()}`, { Origin: "https://evil.test" });
    expect(await bad.closed).toBe(4403);
    const good = connect(`${base}/ws/servers?ticket=${await ticketFor()}`, { Origin: "https://panel.test" });
    expect((await good.next()).type).toBe("servers");
  });
});

describe("live channel", () => {
  it("sends a snapshot and then live race events", async () => {
    const { base, h } = await setup({ players: [player("p1")] });
    const socket = connect(`${base}/ws/live/server-1?ticket=${await ticketFor(viewer)}`);

    const snapshot = await socket.next("beginMatch");
    expect(snapshot.data.info.type).toBe("rounds");

    await h.script("Trackmania.Event.WayPoint", { login: "p1", accountid: "a", racetime: 1000, isendrace: true, checkpointinrace: 1, curracecheckpoints: [1000] });
    const finish = await socket.next("finish");
    expect(finish.data.round.players.p1).toMatchObject({ hasFinished: true, time: 1000 });
  });

  it("denies users without access to the server", async () => {
    const { base } = await setup();
    expect(await connect(`${base}/ws/live/server-1?ticket=${await ticketFor()}`).closed).toBe(4403);
  });

  it("reports servers this service does not manage", async () => {
    const { base } = await setup();
    expect(await connect(`${base}/ws/live/other?ticket=${await ticketFor({ admin: true })}`).closed).toBe(4404);
  });

  it("closes sockets when the server is removed", async () => {
    const { base, registry } = await setup();
    const socket = connect(`${base}/ws/map/server-1?ticket=${await ticketFor(viewer)}`);
    await socket.next("activeMap");
    await registry.remove("server-1");
    expect(await socket.closed).toBe(1001);
  });
});

describe("map and players channels", () => {
  it("sends the active map and map changes", async () => {
    const { base, h } = await setup();
    const socket = connect(`${base}/ws/map/server-1?ticket=${await ticketFor(viewer)}`);
    expect((await socket.next()).data).toBe("map-a-uid");

    await h.script("Maniaplanet.StartMap_Start", { map: { uid: "next" } });
    expect((await socket.next("startMap")).data).toEqual({ mapUid: "next" });
  });

  it("requires moderator rights for the player list", async () => {
    const { base, h } = await setup({ players: [player("p1")] });
    expect(await connect(`${base}/ws/players/server-1?ticket=${await ticketFor(viewer)}`).closed).toBe(4403);

    const moderator = { servers: [{ id: "server-1", name: "S", role: "Moderator" as const }] };
    const socket = connect(`${base}/ws/players/server-1?ticket=${await ticketFor(moderator)}`);
    expect((await socket.next("playerList")).data.map((p: any) => p.login)).toEqual(["p1"]);

    await h.callback("ManiaPlanet.PlayerDisconnect", ["p1", ""]);
    expect((await socket.next("playerDisconnect")).data).toEqual({ login: "p1" });
  });
});

describe("server-wide channels", () => {
  it("lists accessible servers and pushes connection changes", async () => {
    const { base, h } = await setup();
    const socket = connect(
      `${base}/ws/servers?ticket=${await ticketFor({
        groups: [{ id: "g", name: "G", role: "Member", servers: [{ id: "server-1", name: "Test Server", filemanagerUrl: "http://fm" }] }],
      })}`,
    );
    expect((await socket.next("servers")).data).toEqual([
      { id: "server-1", name: "Test Server", filemanagerUrl: "http://fm", isConnected: true },
    ]);

    h.session.drop();
    await flush();
    expect((await socket.next("disconnect")).data).toEqual({ serverId: "server-1" });
  });

  it("shows every client to users with servers:clients:view", async () => {
    const { base } = await setup();
    const socket = connect(`${base}/ws/clients?ticket=${await ticketFor({ permissions: ["servers:clients:view"] })}`);
    expect((await socket.next("clients")).data).toHaveLength(1);

    const other = connect(`${base}/ws/clients?ticket=${await ticketFor()}`);
    expect((await other.next("clients")).data).toEqual([]);
  });

  it("delivers admin notifications only to the addressed admin", async () => {
    const { base, h, registry } = await setup({ players: [player("p1")] });
    h.notifications.adminUserIds = ["user-1", "user-2"];
    const admin = { servers: [{ id: "server-1", name: "S", role: "Admin" as const }] };
    const mine = connect(`${base}/ws/notifications?ticket=${await ticketFor(admin)}`);
    const notAdmin = connect(`${base}/ws/notifications?ticket=${await ticketFor({ id: "user-2" })}`);
    // Both sockets must finish asynchronous ticket verification and subscribe first.
    await vi.waitFor(() => {
      expect(registry.events.listenerCount("adminCommand")).toBe(2);
    });

    const created = await h.notifications.createForServerAdmins({ serverId: "server-1", type: "adminCommand", message: "help" });
    h.runtime.events.emit("adminCommand", created);

    const message = await mine.next("adminCommand");
    expect(message.data).toMatchObject({ userId: "user-1", message: "help" });
    await flush();
    expect(notAdmin.messages).toEqual([]);
  });
});
