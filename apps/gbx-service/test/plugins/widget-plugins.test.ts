import { describe, expect, it } from "vitest";
import slugid from "slugid";
import { isValidEcmApiKey } from "../../../../plugins/ecm/src";
import { sortRoundEntries } from "../../../../plugins/live-round/src";
import { FINISHED, sortActiveRuns } from "../../../../plugins/ta-active-runs/src";
import { rankLeaderboard } from "../../../../plugins/ta-leaderboard/src";
import { createHarness, firstPartyPackage, player, type HarnessOptions } from "../fakes/harness";

// The first-party plugins as packages in the sandbox, the way servers run them

const TA = "Trackmania/TM_TimeAttack_Online.Script.txt";
const accountLogin = (uuid: string) => slugid.encode(uuid);

function finish(login: string, racetime: number, accountid = `acc-${login}`) {
  return {
    time: 0, login, accountid, racetime, laptime: racetime, stuntsscore: 0,
    checkpointinrace: 2, checkpointinlap: 2, isendrace: true, isendlap: true,
    curracecheckpoints: [racetime / 2, racetime], curlapcheckpoints: [], blockid: "", speed: 0,
  };
}

async function withPackage(slug: string, options: HarnessOptions & { config?: unknown } = {}) {
  const { config, ...rest } = options;
  return createHarness({ ...rest, packages: [{ bytes: await firstPartyPackage(slug), config }] });
}

const page = (slug: string, id: string) => `plg.${slug}.${id}`;

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
    const h = await withPackage("ta-leaderboard");
    expect(h.runtime.plugins.loadedIds()).toEqual([]);
  });

  it("shows a finish and keeps the best time", async () => {
    const h = await withPackage("ta-leaderboard", { scriptName: TA, players: [player("p1")] });

    await h.script("Trackmania.Event.WayPoint", finish("p1", 50000));
    await h.script("Trackmania.Event.WayPoint", finish("p1", 51000));
    await h.clock.advance(100);

    expect(h.session.widgetJson(page("ta-leaderboard", "ta-leaderboard-widget-update"), "recordsJson")).toEqual([
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
    const h = await withPackage("ta-active-runs", {
      scriptName: TA,
      players: [player("p1"), player("spec", { SpectatorStatus: 1 })],
    });
    await h.script("Trackmania.Event.WayPoint", { ...finish("p1", 1234), isendrace: false, checkpointinrace: 0 });
    await h.clock.advance(100);

    expect(h.session.widgetJson(page("ta-active-runs", "ta-active-runs-widget-update"), "activeRunsJson")).toEqual([
      { login: "p1", name: "Nick p1", time: 1234, checkpoint: 1 },
    ]);
  });
});

describe("map-info", () => {
  it("shows the current map", async () => {
    const h = await withPackage("map-info");
    expect(h.session.widgetJson(page("map-info", "map-info-widget-update"), "mapJson")).toEqual({
      name: "Map A",
      author: "Author",
    });
  });
});

describe("admin", () => {
  it("notifies admins from the button and the command", async () => {
    const h = await withPackage("admin", { players: [player("p1")] });
    const events: unknown[] = [];
    h.runtime.events.on("adminCommand", (n) => events.push(n));

    await h.click("p1", "admin:notify-admin-action");
    await h.chat("p1", "/admin server is lagging");

    expect(h.notifications.created.map((n) => [n.message, n.description])).toEqual([
      ["Nick p1 asked for help on server Test Server", null],
      ["Nick p1 asked for help on server Test Server", "server is lagging"],
    ]);
    expect(events).toHaveLength(2);
    expect(h.session.callsTo("ChatSendServerMessageToLogin").at(-1)?.params).toEqual(["Admins have been notified", "p1"]);
    expect(h.session.lastManialink(page("admin", "notify-admin-widget"))).toContain('action="admin:notify-admin-action"');
  });
});

describe("records-info", () => {
  it("combines the local record and the world record", async () => {
    const h = await withPackage("records-info", { connect: false, config: { localRecordText: "SR" } });
    h.records.localRecord = { login: "p1", time: 41000, nickName: "Local Hero" };
    h.nadeo.worldRecords.set("map-a-uid", { accountId: "wr-acc", score: 39000 });
    h.nadeo.names = { "wr-acc": "World Hero" };
    await h.runtime.start();
    await new Promise((r) => setImmediate(r));

    expect(h.session.widgetJson(page("records-info", "records-info-widget-update"), "recordsInfoJson")).toEqual({
      worldRecord: { time: 39000, nickName: "World Hero" },
      localRecord: { time: 41000, nickName: "Local Hero" },
    });
  });

  it("updates the local record live and ignores warm-up runs", async () => {
    const h = await withPackage("records-info", { players: [player("p1")] });
    const records = () => h.session.widgetJson(page("records-info", "records-info-widget-update"), "recordsInfoJson");
    await h.script("Trackmania.WarmUp.Start");
    await h.script("Trackmania.Event.WayPoint", finish("p1", 30000));
    expect(records().localRecord.time).toBe(0);

    await h.script("Trackmania.WarmUp.End");
    await h.script("Trackmania.Event.WayPoint", finish("p1", 30000));
    expect(records().localRecord).toEqual({ time: 30000, nickName: "Nick p1" });
  });

  it("keeps working when Nadeo is down", async () => {
    const h = await withPackage("records-info", { connect: false });
    h.nadeo.fail = true;
    expect(await h.runtime.start()).toBe(true);
    expect(h.runtime.plugins.loadedIds()).toEqual(["records-info"]);
  });
});

describe("player-info", () => {
  it("shows records, personal bests and configured setups", async () => {
    const uuid = "6f2d5f5c-8b1e-4d4b-9c3e-1a2b3c4d5e6f";
    const login = accountLogin(uuid);
    const h = await withPackage("player-info", {
      connect: false,
      players: [player(login), player("fakeplayer1")],
      config: { playerInfos: [{ login, device: "Keyboard" }] },
    });
    h.records.playerRecords = [{ login, time: 45000, nickName: null }];
    h.nadeo.personalBests.set(uuid, 44000);
    await h.runtime.start();
    await new Promise((r) => setImmediate(r));

    expect(h.session.widgetJson(page("player-info", "player-info-widget-update"), "playerInfosJson")).toEqual([
      { login, name: `Nick ${login}`, personalBest: 44000, localRecord: 45000, device: "Keyboard", camera: "Unknown" },
    ]);
  });
});

describe("live-ranking", () => {
  it("ranks players by match points from end-of-round scores", async () => {
    const h = await withPackage("live-ranking", { players: [player("a"), player("b")] });
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
    await h.clock.advance(100);
    const rankings = h.session.widgetJson(page("live-ranking", "live-ranking-widget-update"), "rankingsJson");
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
    const h = await withPackage("live-round", { players: [player("a"), player("b")] });
    await h.script("Trackmania.Event.WayPoint", finish("b", 31000));
    await h.script("Trackmania.Event.WayPoint", finish("a", 30000));
    await h.clock.advance(100);

    const finishes = h.session.widgetJson(page("live-round", "live-round-widget-update"), "finishesJson");
    expect(finishes.map((f: any) => [f.login, f.points])).toEqual([["a", 10], ["b", 6]]);
    expect(finishes[0].isLocalRecord).toBe(true);
    expect(finishes[1].isLocalRecord).toBe(false);
  });

  it("sends at most one widget update per 100 ms", async () => {
    const h = await withPackage("live-round", { players: [player("a"), player("b")] });
    await h.clock.advance(100);
    const updates = () => h.session.sentManialinkIds().filter((id) => id === page("live-round", "live-round-widget-update")).length;
    const before = updates();

    await h.script("Trackmania.Event.WayPoint", { ...finish("a", 100), isendrace: false, checkpointinrace: 0 });
    const perSend = updates() - before;
    expect(perSend).toBeGreaterThan(0);

    for (let i = 2; i <= 20; i++) {
      await h.script("Trackmania.Event.WayPoint", { ...finish("a", i * 100), isendrace: false, checkpointinrace: i - 1 });
    }
    expect(updates() - before).toBe(perSend);
    await h.clock.advance(100);
    expect(updates() - before).toBe(2 * perSend);
  });
});

describe("ecm", () => {
  const ecmRequests = (h: Awaited<ReturnType<typeof createHarness>>) =>
    h.http.requests.map((r) => ({ url: r.url, auth: r.headers.authorization, body: JSON.parse(r.body ?? "null") }));

  it("validates api keys", () => {
    expect(isValidEcmApiKey("match_token")).toBe(true);
    expect(isValidEcmApiKey("no-underscore")).toBe(false);
    expect(isValidEcmApiKey(undefined)).toBe(true);
  });

  it("reports finishes to eCircuitMania only while recording", async () => {
    const h = await withPackage("ecm", { players: [player("p1")], config: { apiKey: "m_t", isRecording: false } });
    await h.script("Trackmania.Event.WayPoint", finish("p1", 30000));
    expect(h.http.requests).toEqual([]);

    h.servers.servers.get("server-1")!.plugins[0].config = { apiKey: "m_t", isRecording: true };
    await h.runtime.refreshPlugins();
    await h.script("Trackmania.Event.WayPoint", finish("p1", 30000));
    expect(ecmRequests(h)).toEqual([
      {
        url: "https://us-central1-fantasy-trackmania.cloudfunctions.net/match-addRoundTime?matchId=m",
        auth: "t",
        body: { finishTime: 30000, ubisoftUid: "acc-p1", roundNum: 1, mapId: "map-a-uid" },
      },
    ]);
  });

  it("lets editors toggle recording and save the key from the in-game window", async () => {
    const h = await withPackage("ecm", { players: [player("editor"), player("viewer")], config: { editors: ["editor"] } });
    await h.chat("viewer", "/ecm");
    await h.click("viewer", "ecm:ecm-toggle-recording");
    expect(h.servers.configUpdates).toEqual([]);

    await h.chat("editor", "/ecm");
    await h.click("editor", "ecm:ecm-toggle-recording");
    expect(h.servers.configUpdates.at(-1)?.config).toMatchObject({ isRecording: true });

    await h.click("editor", "ecm:ecm-save-api-key", [{ Name: "ecm-api-key-entry", Value: "match_token" }]);
    expect(h.servers.configUpdates.at(-1)?.config).toMatchObject({ apiKey: "match_token", isRecording: true });
  });

  it("adds its button to the action group", async () => {
    const h = await withPackage("ecm");
    expect(h.runtime.manialinks.displayedIds()).toContain("action-group-widget");
  });
});
