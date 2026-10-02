import { describe, expect, it } from "vitest";
import { matchPlugin } from "../../src/core/plugins/builtin/match";
import { createHarness, player, pluginRecord } from "../fakes/harness";

const config = {
  admins: ["admin"],
  maps: ["Campaigns/MapA.Map.Gbx", "Campaigns/MapB.Map.Gbx"],
  pickAndBan: { type: "player", order: "b:1,p:2", choosePosition: false, players: [{ login: "p1", seed: 1 }, { login: "p2", seed: 2 }] },
  lobby: { map: "Lobby.Map.Gbx" },
};

async function setup(overrides: Record<string, unknown> = {}) {
  return createHarness({
    plugins: [matchPlugin],
    players: [player("admin"), player("p1"), player("p2")],
    server: { plugins: [pluginRecord("match", { ...config, ...overrides })] },
  });
}

const told = (h: Awaited<ReturnType<typeof setup>>, login: string) =>
  h.session.callsTo("ChatSendServerMessageToLogin").filter((c) => c.params[1] === login).map((c) => c.params[0]);
const broadcast = (h: Awaited<ReturnType<typeof setup>>) =>
  h.session.callsTo("ChatSendServerMessage").map((c) => c.params[0]);

describe("match plugin", () => {
  it("rejects commands from non-admins", async () => {
    const h = await setup();
    await h.chat("p1", "/pickban");
    expect(told(h, "p1")).toContain("You are not authorized to start the pick and ban phase");
  });

  it("runs a full pick and ban and starts the match with the picked maps", async () => {
    const h = await setup();
    await h.chat("admin", "/pickban");
    expect(broadcast(h).at(-1)).toContain("Pick and ban phase started");
    expect(h.session.widgetJson("match-pickban-widget-update", "currentActionJson")).toMatchObject({
      action: "ban",
      login: "p1",
    });

    await h.click("p1", "match-pickban-action-map-a-uid");
    await h.click("p2", "match-pickban-action-map-b-uid");
    expect(broadcast(h)).toContain("Pick and ban phase completed, match is ready to start");

    h.session.calls.length = 0;
    await h.chat("admin", "/matchstart");
    const added = h.session.callsTo("AddMapList").map((c) => c.params[0]);
    expect(added).toContainEqual(["Campaigns/MapB.Map.Gbx"]);
    expect(h.session.callsTo("JumpToMapIndex")[0].params).toEqual([0]);
  });

  it("picks a random map for a player who runs out of time", async () => {
    const h = await setup({ pickAndBan: { ...config.pickAndBan, timeout: 30 } });
    await h.chat("admin", "/pickban");
    await h.clock.advance(30_000);
    expect(broadcast(h).some((m) => /Nick p1 ran out of time, .* was randomly banned/.test(String(m)))).toBe(true);
  });

  it("pauses through the mode script when pausing is available", async () => {
    const h = await setup();
    await h.chat("admin", "/pause");
    expect(told(h, "admin")).toContain("Pausing is not available in this mode");

    h.runtime.state.liveInfo.pauseAvailable = true;
    await h.chat("admin", "/pause");
    expect(h.session.callsTo("TriggerModeScriptEventArray").at(-1)?.params).toEqual([
      "Maniaplanet.Pause.SetActive",
      ["true"],
    ]);
    expect(broadcast(h)).toContain("Match paused by Nick admin");
  });

  it("stops the match and returns to the lobby map", async () => {
    const h = await setup();
    await h.chat("admin", "/matchstop");
    expect(broadcast(h)).toContain("Match stopped");
    expect(h.session.callsTo("AddMapList").at(-1)?.params).toEqual([["Lobby.Map.Gbx"]]);
  });

  it("validates /setseeds input", async () => {
    const h = await setup();
    await h.chat("admin", "/setseeds 2 x");
    expect(told(h, "admin")).toContain("Invalid seed(s) provided, please provide valid numbers");
    await h.chat("admin", "/setseeds 2 1");
    expect(told(h, "admin")).toContain("Seeds for pick and ban order have been set to: 2, 1");
  });
});
