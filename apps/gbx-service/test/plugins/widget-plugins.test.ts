import { describe, expect, it } from "vitest";
import slugid from "slugid";
import { ecmPlugin, isValidEcmApiKey } from "../../src/core/plugins/builtin/ecm";
import { liveRankingPlugin } from "../../src/core/plugins/builtin/live-ranking";
import { liveRoundPlugin, sortRoundEntries } from "../../src/core/plugins/builtin/live-round";
import { mapInfoPlugin } from "../../src/core/plugins/builtin/map-info";
import { notifyAdminPlugin } from "../../src/core/plugins/builtin/notify-admin";
import { playerInfoPlugin } from "../../src/core/plugins/builtin/player-info";
import { recordsInfoPlugin } from "../../src/core/plugins/builtin/records-info";
import { FINISHED, sortActiveRuns, taActiveRunsPlugin } from "../../src/core/plugins/builtin/ta-active-runs";
import { rankLeaderboard, taLeaderboardPlugin } from "../../src/core/plugins/builtin/ta-leaderboard";
import type { PluginDefinition } from "../../src/core/plugins/sdk";
import { createHarness, player, pluginRecord } from "../fakes/harness";

const TA = "Trackmania/TM_TimeAttack_Online.Script.txt";
const accountLogin = (uuid: string) => slugid.encode(uuid);

function finish(login: string, racetime: number, accountid = `acc-${login}`) {
  return {
    time: 0, login, accountid, racetime, laptime: racetime, stuntsscore: 0,
    checkpointinrace: 2, checkpointinlap: 2, isendrace: true, isendlap: true,
    curracecheckpoints: [racetime / 2, racetime], curlapcheckpoints: [], blockid: "", speed: 0,
  };
}

async function withPlugin(plugin: PluginDefinition<any>, options: Parameters<typeof createHarness>[0] = {}) {
  return createHarness({
    ...options,
    plugins: [plugin],
    server: { ...options.server, plugins: [pluginRecord(plugin.id, options.server?.plugins?.[0]?.config ?? {})] },
  });
}

describe("ta-leaderboard", () => {
  it("ranks finished players before players without a time", () => {
    const ranked = rankLeaderboard([
      { rank: 0, login: "none", name: "N", time: -1 },
      { rank: 0, login: "slow", name: "S", time: 50 },
      { rank: 0, login: "fast", name: "F", time: 40 },
    ]);
    expect(ranked.map((r) => [r.login, r.rank])).toEqual([["fast", 1], ["slow", 2], ["none", 3]]);
  });

  it("only loads in time attack", async () => {
    const h = await withPlugin(taLeaderboardPlugin);
    expect(h.runtime.plugins.loadedIds()).toEqual([]);
  });

  it("shows a first finish immediately and keeps the best time", async () => {
    const h = await withPlugin(taLeaderboardPlugin, { scriptName: TA, players: [player("p1")] });

    await h.script("Trackmania.Event.WayPoint", finish("p1", 50000));
    await h.script("Trackmania.Event.WayPoint", finish("p1", 51000));

    expect(h.session.widgetJson("ta-leaderboard-widget-update", "recordsJson")).toEqual([
      { rank: 1, login: "p1", name: "Nick p1", time: 50000 },
    ]);
  });
});

describe("ta-active-runs", () => {
  it("orders furthest along first and finished runs last", () => {
    const sorted = sortActiveRuns([
      { login: "done", name: "", time: 30, checkpoint: FINISHED },
      { login: "cp1", name: "", time: 10, checkpoint: 1 },
      { login: "cp2", name: "", time: 20, checkpoint: 2 },
    ]);
    expect(sorted.map((r) => r.login)).toEqual(["cp2", "cp1", "done"]);
  });

  it("lists racing players and tracks their checkpoints", async () => {
    const h = await withPlugin(taActiveRunsPlugin, {
      scriptName: TA,
      players: [player("p1"), player("spec", { SpectatorStatus: 1 })],
    });
    await h.script("Trackmania.Event.WayPoint", { ...finish("p1", 1234), isendrace: false, checkpointinrace: 0 });

    expect(h.session.widgetJson("ta-active-runs-widget-update", "activeRunsJson")).toEqual([
      { login: "p1", name: "Nick p1", time: 1234, checkpoint: 1 },
    ]);
  });
});

describe("map-info", () => {
  it("shows the current map", async () => {
    const h = await withPlugin(mapInfoPlugin);
    expect(h.session.widgetJson("map-info-widget-update", "mapJson")).toEqual({ name: "Map A", author: "Author" });
  });
});

describe("notify-admin", () => {
  it("notifies admins from the button and the command", async () => {
    const h = await withPlugin(notifyAdminPlugin, { players: [player("p1")] });
    const events: unknown[] = [];
    h.runtime.events.on("adminCommand", (n) => events.push(n));

    await h.click("p1", "notify-admin-action");
    await h.chat("p1", "/admin server is lagging");

    expect(h.notifications.created.map((n) => [n.message, n.description])).toEqual([
      ["Nick p1 asked for help on server Test Server", null],
      ["Nick p1 asked for help on server Test Server", "server is lagging"],
    ]);
    expect(events).toHaveLength(2);
    expect(h.session.callsTo("ChatSendServerMessageToLogin").at(-1)?.params).toEqual(["Admins have been notified", "p1"]);
  });
});

describe("records-info", () => {
  it("combines the local record and the world record", async () => {
    const h = await createHarness({ connect: false, plugins: [recordsInfoPlugin], server: { plugins: [pluginRecord("records-info", { localRecordText: "SR" })] } });
    h.records.localRecord = { login: "p1", time: 41000, nickName: "Local Hero" };
    h.nadeo.worldRecords.set("map-a-uid", { accountId: "wr-acc", score: 39000 });
    h.nadeo.names = { "wr-acc": "World Hero" };
    await h.runtime.start();

    await new Promise((r) => setImmediate(r));
    expect(h.session.widgetJson("records-info-widget-update", "recordsInfoJson")).toEqual({
      worldRecord: { time: 39000, nickName: "World Hero" },
      localRecord: { time: 41000, nickName: "Local Hero" },
    });
  });

  it("updates the local record live and ignores warm-up runs", async () => {
    const h = await withPlugin(recordsInfoPlugin, { players: [player("p1")] });
    await h.script("Trackmania.WarmUp.Start");
    await h.script("Trackmania.Event.WayPoint", finish("p1", 30000));
    expect(h.session.widgetJson("records-info-widget-update", "recordsInfoJson").localRecord.time).toBe(0);

    await h.script("Trackmania.WarmUp.End");
    await h.script("Trackmania.Event.WayPoint", finish("p1", 30000));
    expect(h.session.widgetJson("records-info-widget-update", "recordsInfoJson").localRecord).toEqual({
      time: 30000,
      nickName: "Nick p1",
    });
  });

  it("keeps working when Nadeo is down", async () => {
    const h = await createHarness({ connect: false, plugins: [recordsInfoPlugin], server: { plugins: [pluginRecord("records-info")] } });
    h.nadeo.fail = true;
    expect(await h.runtime.start()).toBe(true);
    expect(h.runtime.plugins.loadedIds()).toEqual(["records-info"]);
  });
});

describe("player-info", () => {
  it("shows records, personal bests and configured setups", async () => {
    const uuid = "6f2d5f5c-8b1e-4d4b-9c3e-1a2b3c4d5e6f";
    const login = accountLogin(uuid);
    const h = await createHarness({
      connect: false,
      plugins: [playerInfoPlugin],
      players: [player(login), player("fakeplayer1")],
      server: { plugins: [pluginRecord("player-info", { playerInfos: [{ login, device: "Keyboard" }] })] },
    });
    h.records.playerRecords = [{ login, time: 45000, nickName: null }];
    h.nadeo.personalBests.set(uuid, 44000);
    await h.runtime.start();
    await new Promise((r) => setImmediate(r));

    expect(h.session.widgetJson("player-info-widget-update", "playerInfosJson")).toEqual([
      { login, name: `Nick ${login}`, personalBest: 44000, localRecord: 45000, device: "Keyboard", camera: "Unknown" },
    ]);
  });
});

describe("live-ranking", () => {
  it("ranks players by match points from end-of-round scores", async () => {
    const h = await withPlugin(liveRankingPlugin, { players: [player("a"), player("b")] });
    await h.script("Trackmania.Scores", {
      responseid: "",
      section: "EndRound",
      useteams: false,
      teams: [],
      players: [
        { login: "a", name: "A", team: 0, matchpoints: 10 },
        { login: "b", name: "B", team: 0, matchpoints: 20 },
      ],
    });
    const rankings = h.session.widgetJson("live-ranking-widget-update", "rankingsJson");
    expect(rankings.map((r: any) => [r.login, r.rank, r.points])).toEqual([["b", 1, 20], ["a", 2, 10]]);
  });
});

describe("live-round", () => {
  it("orders by checkpoints, then time, then latest split", () => {
    const entry = (login: string, time: number, checkpoints: number[]) => ({
      login, name: login, rank: 0, points: 0, time, checkpoints, team: { mainColor: "", secondaryColor: "", textColor: "" },
    });
    const sorted = sortRoundEntries([
      entry("behind", 5000, [1000]),
      entry("tieSlower", 9000, [3000, 9000]),
      entry("tieFaster", 9000, [2000, 9000]),
    ]);
    expect(sorted.map((e) => e.login)).toEqual(["tieFaster", "tieSlower", "behind"]);
  });

  it("awards repartition points by finish order", async () => {
    const h = await withPlugin(liveRoundPlugin, { players: [player("a"), player("b")] });
    await h.script("Trackmania.Event.WayPoint", finish("b", 31000));
    await h.script("Trackmania.Event.WayPoint", finish("a", 30000));

    const finishes = h.session.widgetJson("live-round-widget-update", "finishesJson");
    expect(finishes.map((f: any) => [f.login, f.points])).toEqual([["a", 10], ["b", 6]]);
    expect(finishes[0].isLocalRecord).toBe(true);
    expect(finishes[1].isLocalRecord).toBe(false);
  });
});

describe("ecm", () => {
  it("validates api keys", () => {
    expect(isValidEcmApiKey("match_token")).toBe(true);
    expect(isValidEcmApiKey("no-underscore")).toBe(false);
    expect(isValidEcmApiKey(undefined)).toBe(true);
  });

  it("reports finishes only while recording", async () => {
    const h = await createHarness({
      plugins: [ecmPlugin],
      players: [player("p1")],
      server: { plugins: [pluginRecord("ecm", { apiKey: "m_t", isRecording: false })] },
    });
    await h.script("Trackmania.Event.WayPoint", finish("p1", 30000));
    expect(h.ecm.finishes).toEqual([]);

    h.servers.servers.get("server-1")!.plugins = [pluginRecord("ecm", { apiKey: "m_t", isRecording: true })];
    await h.runtime.refreshPlugins();
    await h.script("Trackmania.Event.WayPoint", finish("p1", 30000));
    expect(h.ecm.finishes).toEqual([
      { apiKey: "m_t", body: { finishTime: 30000, ubisoftUid: "acc-p1", roundNum: 1, mapId: "map-a-uid" } },
    ]);
  });

  it("lets editors toggle recording from the in-game window", async () => {
    const h = await createHarness({
      plugins: [ecmPlugin],
      players: [player("editor"), player("viewer")],
      server: { plugins: [pluginRecord("ecm", { editors: ["editor"] })] },
    });
    await h.chat("viewer", "/ecm");
    await h.click("viewer", "ecm-toggle-recording");
    expect(h.servers.configUpdates).toEqual([]);

    await h.chat("editor", "/ecm");
    await h.click("editor", "ecm-toggle-recording");
    expect(h.servers.configUpdates.at(-1)?.config).toMatchObject({ isRecording: true });
  });

  it("adds its button to the action group", async () => {
    const h = await withPlugin(ecmPlugin);
    expect(h.runtime.manialinks.displayedIds()).toContain("action-group-widget");
  });
});
