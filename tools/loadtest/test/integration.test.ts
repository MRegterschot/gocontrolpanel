import { afterEach, describe, expect, it } from "vitest";
import { EvotmGbxSession } from "../../../apps/gbx-service/src/infra/gbx/evotm-session";
import { startServer } from "./helpers.js";

const noop = () => undefined;
const log: any = {
  warn: noop,
  info: noop,
  error: noop,
  debug: noop,
  child: () => log,
};
const stops: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  for (const s of stops.splice(0)) await s();
});

describe("real EvotmGbxSession against the fake server", () => {
  it("runs the connect flow and receives a WayPoint", async () => {
    const { server, stats } = await startServer({ password: "secret" });
    stops.push(() => server.stop());
    const session = new EvotmGbxSession(log);
    stops.push(() => session.disconnect());

    await session.connect("127.0.0.1", server.port, 3000);
    await expect(session.call("GetPlayerList", 1000, 0)).rejects.toThrow(); // not authorized yet
    await expect(
      session.call("Authenticate", "SuperAdmin", "wrong"),
    ).rejects.toThrow("Wrong login/password");
    await session.call("Authenticate", "SuperAdmin", "secret");
    await session.call("SetApiVersion", "2023-04-16");
    await session.call("EnableCallbacks", true);

    const seen: { method: string; data: any }[] = [];
    session.onCallback((method, data) => seen.push({ method, data }));
    await session.callScript("XmlRpc.EnableCallbacks", "true");
    await session.callScript(
      "Trackmania.Event.SetCurRaceCheckpointsMode",
      "always",
    );
    await session.call("ChatEnableManualRouting", true);

    const players = await session.call<any[]>("GetPlayerList", 1000, 0);
    expect(players.length).toBe(4); // 3 bots + the server's own player
    expect(players[1].Login).toBe("lt-0-0");

    await session.callScript("Trackmania.GetScores", "tmcp");
    const [multi] = await session.multicall([
      ["GetVersion"],
      ["GetCurrentMapInfo"],
    ]);
    expect((multi as any).Name).toBe("Trackmania");
    await expect(session.call("NoSuchMethod")).rejects.toThrow(
      "Unknown method",
    );
    expect(stats.unknown.get("NoSuchMethod")).toBe(1);

    for (let i = 0; i < 200; i++) server.sim.tick(100);
    await new Promise((r) => setTimeout(r, 200));

    const script = seen.filter(
      (c) => c.method === "ManiaPlanet.ModeScriptCallbackArray",
    );
    const scores = script.find(
      (c) =>
        c.data[0] === "Trackmania.Scores" &&
        JSON.parse(c.data[1][0]).responseid === "tmcp",
    );
    expect(scores).toBeDefined();
    const wp = script.find((c) => c.data[0] === "Trackmania.Event.WayPoint");
    expect(wp).toBeDefined();
    const payload = JSON.parse(wp!.data[1][0]);
    expect(payload).toMatchObject({
      checkpointinrace: expect.any(Number),
      isendrace: expect.any(Boolean),
    });
    expect(payload.login).toMatch(/^lt-0-/);
  });
});
