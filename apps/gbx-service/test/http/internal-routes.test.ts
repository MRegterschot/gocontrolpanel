import { internalPaths } from "@tmcp/shared";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, SERVICE_TOKEN } from "./app-fixture";
import { serverRecord } from "../fakes/harness";

let close: (() => Promise<void>) | null = null;
afterEach(async () => {
  await close?.();
  close = null;
});

async function setup(options: Parameters<typeof createApp>[0] = {}) {
  const fixture = await createApp(options);
  close = () => fixture.app.close();
  return fixture;
}

describe("service auth", () => {
  it("rejects missing and wrong tokens", async () => {
    const { app } = await setup();
    const missing = await app.inject({ method: "GET", url: internalPaths.servers });
    const wrong = await app.inject({
      method: "GET",
      url: internalPaths.servers,
      headers: { authorization: `Bearer ${SERVICE_TOKEN}nope` },
    });
    expect(missing.statusCode).toBe(401);
    expect(wrong.json()).toEqual({ error: { code: "Unauthorized", message: "Missing or invalid service token" } });
  });

  it("leaves the health check open", async () => {
    const { app } = await setup();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.json()).toEqual({ status: "ok", servers: 1, connected: 1 });
  });
});

describe("status routes", () => {
  it("lists servers and their connection state", async () => {
    const { request } = await setup();
    const res = await request("GET", internalPaths.servers);
    expect(res.json().data).toEqual([
      { serverId: "server-1", name: "Test Server", isConnected: true, isReconnecting: false, reconnectingAt: null },
    ]);
  });

  it("returns 404 for servers this service does not manage", async () => {
    const { request } = await setup();
    const res = await request("GET", internalPaths.server("nope"));
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("ServerNotFound");
  });

  it("returns the live snapshot", async () => {
    const { request } = await setup();
    const res = await request("GET", internalPaths.live("server-1"));
    expect(res.json().data).toMatchObject({ activeMap: "map-a-uid", liveInfo: { type: "rounds" } });
  });

  it("returns 404 json for unknown routes", async () => {
    const { request } = await setup();
    expect((await request("GET", "/internal/nope")).json().error.code).toBe("NotFound");
  });
});

describe("connection controls", () => {
  it("disconnects, reports offline commands and reconnects", async () => {
    const { request, h } = await setup();
    await request("POST", internalPaths.disconnect("server-1"));
    expect(h.runtime.isConnected).toBe(false);

    const offline = await request("POST", internalPaths.script("server-1"), { script: "x" });
    expect(offline.statusCode).toBe(409);
    expect(offline.json().error.code).toBe("ServerNotConnected");

    const res = await request("POST", internalPaths.reconnect("server-1"));
    expect(res.json().data).toEqual({ connected: true });
  });

  it("accepts bodyless POSTs sent with a JSON content type", async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: "POST",
      url: internalPaths.reconnect("server-1"),
      headers: { authorization: `Bearer ${SERVICE_TOKEN}`, "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("still rejects malformed JSON", async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: "POST",
      url: internalPaths.chat("server-1"),
      headers: { authorization: `Bearer ${SERVICE_TOKEN}`, "content-type": "application/json" },
      payload: "{nope",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("BadRequest");
  });

  it("resends manialinks and reloads plugins", async () => {
    const { request } = await setup();
    expect((await request("POST", internalPaths.resendManialinks("server-1"))).statusCode).toBe(200);
    expect((await request("POST", internalPaths.reloadPlugins("server-1"))).statusCode).toBe(200);
  });
});

describe("gbx passthrough", () => {
  it("forwards allowlisted calls", async () => {
    const { request, h } = await setup({ configure: (s) => s.respond("GetChatLines", ["hello"]) });
    const res = await request("POST", internalPaths.gbxCall("server-1"), { method: "GetChatLines" });
    expect(res.json()).toEqual({ data: ["hello"] });
    expect(h.session.callsTo("GetChatLines")).toHaveLength(1);
  });

  it("refuses methods outside the allowlist", async () => {
    const { request, h } = await setup();
    const res = await request("POST", internalPaths.gbxCall("server-1"), { method: "StopServer" });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("MethodNotAllowed");
    expect(h.session.callsTo("StopServer")).toHaveLength(0);
  });

  it("refuses a multicall containing one disallowed method", async () => {
    const { request } = await setup();
    const res = await request("POST", internalPaths.gbxMulticall("server-1"), {
      calls: [{ method: "GetServerOptions" }, { method: "SetScriptName", params: ["x"] }],
    });
    expect(res.statusCode).toBe(403);
  });

  it("runs multicalls", async () => {
    const { request } = await setup({ configure: (s) => s.respond("GetServerOptions", { Name: "srv" }) });
    const res = await request("POST", internalPaths.gbxMulticall("server-1"), {
      calls: [{ method: "GetServerOptions" }],
    });
    expect(res.json().data).toEqual([{ Name: "srv" }]);
  });

  it("reports a call the dedicated server rejected inside a multicall as null", async () => {
    const { request } = await setup({
      configure: (s) => s.respond("GetPlayerInfo", (login: string) => (login === "gone" ? undefined : { Login: login })),
    });
    const res = await request("POST", internalPaths.gbxMulticall("server-1"), {
      calls: [
        { method: "GetPlayerInfo", params: ["a"] },
        { method: "GetPlayerInfo", params: ["gone"] },
        { method: "GetPlayerInfo", params: ["b"] },
      ],
    });
    expect(res.json().data).toEqual([{ Login: "a" }, null, { Login: "b" }]);
  });

  it("refuses more than 100 calls in one multicall", async () => {
    const { request } = await setup();
    const calls = Array.from({ length: 101 }, () => ({ method: "GetPlayerInfo", params: ["a"] }));
    expect((await request("POST", internalPaths.gbxMulticall("server-1"), { calls })).statusCode).toBe(400);
  });

  it("maps server faults to 502", async () => {
    const { request } = await setup({
      configure: (s) =>
        s.respond("Kick", () => {
          throw new Error("Login unknown.");
        }),
    });
    const res = await request("POST", internalPaths.gbxCall("server-1"), { method: "Kick", params: ["x", ""] });
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toEqual({ code: "GbxCallFailed", message: "Login unknown." });
  });

  it("validates bodies", async () => {
    const { request } = await setup();
    const res = await request("POST", internalPaths.gbxCall("server-1"), { params: [] });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("BadRequest");
  });
});

describe("stateful commands", () => {
  it("sends chat and changes scripts and settings", async () => {
    const { request, h } = await setup();
    await request("POST", internalPaths.chat("server-1"), { message: "hi", login: "p1" });
    await request("POST", internalPaths.script("server-1"), { script: "TM_Cup" });
    await request("POST", internalPaths.matchSettings("server-1"), { filename: "ms.txt" });
    await request("PUT", internalPaths.scriptSettings("server-1"), { settings: { S_PointsLimit: 10 } });
    await request("POST", internalPaths.pause("server-1"), { paused: true });

    expect(h.session.callsTo("ChatSendServerMessageToLogin")[0].params).toEqual(["hi", "p1"]);
    expect(h.session.callsTo("SetScriptName")).toHaveLength(1);
    expect(h.session.callsTo("LoadMatchSettings")[0].params).toEqual(["ms.txt"]);
    expect(h.session.callsTo("SetModeScriptSettings")).toHaveLength(1);
    expect(h.runtime.state.liveInfo.isPaused).toBe(true);
  });

  it("changes the map list", async () => {
    const { request } = await setup();
    expect((await request("POST", internalPaths.maps("server-1"), { filenames: ["a", "b"] })).json().data).toEqual({ count: 2 });
    expect((await request("PUT", internalPaths.mapsOrder("server-1"), { filenames: ["a"] })).json().data).toEqual({ count: 1 });

    const last = await request("POST", internalPaths.mapsRemove("server-1"), {
      filenames: ["Campaigns/MapA.Map.Gbx", "Campaigns/MapB.Map.Gbx"],
    });
    expect(last.statusCode).toBe(409);
    expect(last.json().error.code).toBe("RemoveLastMapError");
  });

  it("sets player and team points", async () => {
    const { request, h } = await setup();
    const player = await request("PUT", internalPaths.playerPoints("server-1", "p 1"), { type: "round", points: 5 });
    expect(player.statusCode).toBe(200);
    expect(h.session.scriptCalls.at(-1)?.params).toEqual(["p 1", "5", "", ""]);

    const team = await request("PUT", internalPaths.teamPoints("server-1", 1), { type: "match", points: 3 });
    expect(team.statusCode).toBe(200);
    expect((await request("PUT", "/internal/servers/server-1/teams/-1/points", { type: "match", points: 3 })).statusCode).toBe(400);
  });

  it("applies chat config and reports the effective result", async () => {
    const { request } = await setup();
    const res = await request("PUT", internalPaths.chatConfig("server-1"), { ...serverRecord().chat, manualRouting: true });
    expect(res.json().data).toEqual({ applied: { ...serverRecord().chat, manualRouting: true } });
  });
});

describe("chat config while the dedicated server is offline", () => {
  it("accepts it and keeps manual routing as requested", async () => {
    const { request, h } = await setup();
    await request("POST", internalPaths.disconnect("server-1"));

    const config = { ...serverRecord().chat, manualRouting: true, connectMessage: "Welcome" };
    const res = await request("PUT", internalPaths.chatConfig("server-1"), config);

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({ applied: config });
    expect(h.runtime.state.chat).toEqual(config);
  });
});

describe("lifecycle events over http", () => {
  it("removes deleted servers", async () => {
    const { request, registry } = await setup();
    const res = await request("POST", internalPaths.serverEvents, { type: "server.deleted", serverId: "server-1" });
    expect(res.statusCode).toBe(200);
    expect(registry.find("server-1")).toBeUndefined();
  });

  it("rejects unknown event types", async () => {
    const { request } = await setup();
    expect((await request("POST", internalPaths.serverEvents, { type: "server.exploded", serverId: "x" })).statusCode).toBe(400);
  });
});
