import type { Scores, Waypoint } from "@gcp/shared";
import { describe, expect, it, vi } from "vitest";
import { createHarness, MAP_B, player, serverRecord } from "../fakes/harness";

function waypoint(login: string, racetime: number, isendrace: boolean, checkpointinrace = 2): Waypoint {
  return {
    time: 0,
    login,
    accountid: `acc-${login}`,
    racetime,
    laptime: racetime,
    stuntsscore: 0,
    checkpointinrace,
    checkpointinlap: checkpointinrace,
    isendrace,
    isendlap: isendrace,
    curracecheckpoints: [racetime / 2, racetime],
    curlapcheckpoints: [],
    blockid: "",
    speed: 0,
  };
}

function scores(section: string, players: Partial<Scores["players"][number]>[], responseid = ""): Scores {
  return {
    responseid,
    section,
    useteams: false,
    winnerteam: -1,
    winnerplayer: "",
    teams: [],
    players: players.map((p) => ({
      login: "x",
      accountid: "acc",
      name: "X",
      team: 0,
      rank: 1,
      roundpoints: 0,
      mappoints: 0,
      matchpoints: 0,
      bestracetime: -1,
      bestracecheckpoints: [],
      bestlaptime: -1,
      bestlapcheckpoints: [],
      prevracetime: -1,
      prevracecheckpoints: [],
      ...p,
    })),
  };
}

describe("players", () => {
  it("tracks a connecting player and announces them", async () => {
    const h = await createHarness({
      server: { chat: { ...serverRecord().chat, connectMessage: "Welcome {nickName}" } },
    });
    h.world.players.push(player("p1"));
    const connected = vi.fn();
    h.runtime.events.on("playerConnect", connected);

    await h.callback("ManiaPlanet.PlayerConnect", ["p1", false]);

    expect(connected).toHaveBeenCalledWith(expect.objectContaining({ login: "p1", nickName: "Nick p1" }));
    expect(h.players.users.get("p1")).toBe("Nick p1");
    expect(h.runtime.state.liveInfo.activeRound.players.p1).toMatchObject({ checkpoint: 0 });
    expect(h.session.callsTo("ChatSendServerMessage").map((c) => c.params[0])).toContain("Welcome Nick p1");
  });

  it("still tracks the player when the database is down", async () => {
    const h = await createHarness();
    h.players.failNextUpsert = true;
    await h.callback("ManiaPlanet.PlayerConnect", ["p1", false]);
    expect(h.runtime.state.findActivePlayer("p1")).toBeDefined();
  });

  it("does not put spectators in the active round", async () => {
    const h = await createHarness();
    h.world.players.push(player("spec", { SpectatorStatus: 1 }));
    await h.callback("ManiaPlanet.PlayerConnect", ["spec", false]);
    expect(h.runtime.state.liveInfo.activeRound.players.spec).toBeUndefined();
  });

  it("marks disconnecting players and says goodbye", async () => {
    const h = await createHarness({
      players: [player("p1")],
      server: { chat: { ...serverRecord().chat, disconnectMessage: "Bye {nickName}" } },
    });
    await h.callback("ManiaPlanet.PlayerDisconnect", ["p1", ""]);

    expect(h.runtime.state.findActivePlayer("p1")).toBeUndefined();
    expect(h.runtime.state.getPlayerRound("p1")?.connected).toBe(false);
    expect(h.session.callsTo("ChatSendServerMessage").map((c) => c.params[0])).toContain("Bye Nick p1");
  });

  it("moves players between racing and spectating on info changes", async () => {
    const h = await createHarness({ players: [player("p1")] });
    await h.callback("ManiaPlanet.PlayerInfoChanged", [player("p1", { SpectatorStatus: 1 })]);
    expect(h.runtime.state.liveInfo.activeRound.players.p1).toBeUndefined();

    await h.callback("ManiaPlanet.PlayerInfoChanged", [player("p1", { NickName: "New" })]);
    expect(h.runtime.state.liveInfo.activeRound.players.p1).toBeDefined();
    expect(h.runtime.state.findActivePlayer("p1")?.nickName).toBe("New");
  });
});

describe("race events", () => {
  it("records finishes against the current match and round", async () => {
    const h = await createHarness({ players: [player("p1")] });
    const liveFinish = vi.fn();
    h.runtime.events.on("live-finish", liveFinish);

    await h.script("Trackmania.Event.WayPoint", waypoint("p1", 42000, true));

    expect(h.records.saved).toEqual([
      expect.objectContaining({
        login: "p1",
        time: 42000,
        matchId: "match-1",
        round: 1,
        mapUid: "map-a-uid",
        serverId: "server-1",
      }),
    ]);
    expect(liveFinish).toHaveBeenCalled();
    expect(h.runtime.state.liveInfo.activeRound.players.p1).toMatchObject({
      hasFinished: true,
      time: 42000,
      checkpoint: 3,
    });
  });

  it("does not record during warm-up or pause", async () => {
    const h = await createHarness();
    await h.script("Trackmania.WarmUp.Start");
    await h.script("Trackmania.Event.WayPoint", waypoint("p1", 1000, true));
    await h.script("Trackmania.WarmUp.End");
    h.runtime.state.liveInfo.isPaused = true;
    await h.script("Trackmania.Event.WayPoint", waypoint("p1", 1000, true));
    expect(h.records.saved).toEqual([]);
  });

  it("creates the user and retries when a record references an unknown login", async () => {
    const h = await createHarness();
    h.records.requireUsers = h.players;
    h.world.players.push(player("newbie"));

    await h.script("Trackmania.Event.WayPoint", waypoint("newbie", 1000, true));

    expect(h.players.users.get("newbie")).toBe("Nick newbie");
    expect(h.records.saved).toHaveLength(1);
  });

  it("tracks checkpoints in the active round", async () => {
    const h = await createHarness({ players: [player("p1")] });
    const checkpoint = vi.fn();
    h.runtime.events.on("live-checkpoint", checkpoint);
    await h.script("Trackmania.Event.WayPoint", waypoint("p1", 5000, false, 0));
    expect(h.runtime.state.liveInfo.activeRound.players.p1).toMatchObject({ checkpoint: 1, hasFinished: false });
    expect(checkpoint).toHaveBeenCalled();
  });

  it("emits personal bests in time attack only when faster", async () => {
    const h = await createHarness({ scriptName: "Trackmania/TM_TimeAttack_Online.Script.txt" });
    h.runtime.state.patchPlayer("p1", { login: "p1", bestTime: 30000 });
    const pb = vi.fn();
    h.runtime.events.on("personalBest", pb);

    await h.script("Trackmania.Event.WayPoint", waypoint("p1", 31000, true));
    expect(pb).not.toHaveBeenCalled();

    await h.script("Trackmania.Event.WayPoint", waypoint("p1", 29000, true));
    expect(pb).toHaveBeenCalledTimes(1);
    expect(h.runtime.state.getPlayerRound("p1")?.bestTime).toBe(29000);
  });

  it("marks give ups under the right login", async () => {
    const h = await createHarness();
    await h.script("Trackmania.Event.GiveUp", { time: 0, login: "p1", accountid: "a" });
    expect(h.runtime.state.liveInfo.activeRound.players.p1).toMatchObject({ login: "p1", hasGivenUp: true });
    expect(h.runtime.state.liveInfo.activeRound.players.undefined).toBeUndefined();
  });
});

describe("rounds and scores", () => {
  it("counts rounds outside warm-up and rebuilds the active round", async () => {
    const h = await createHarness({ players: [player("p1"), player("spec", { SpectatorStatus: 1 })] });
    await h.script("Maniaplanet.StartRound_Start");
    expect(h.runtime.state.roundNumber).toBe(1);
    expect(Object.keys(h.runtime.state.liveInfo.activeRound.players)).toEqual(["p1"]);

    await h.script("Trackmania.WarmUp.Start");
    await h.script("Maniaplanet.StartRound_Start");
    expect(h.runtime.state.roundNumber).toBe(1);
  });

  it("applies end-of-round scores and emits the live update", async () => {
    const h = await createHarness();
    const endRound = vi.fn();
    h.runtime.events.on("live-endRound", endRound);

    await h.script("Trackmania.Scores", scores("EndRound", [{ login: "p1", matchpoints: 50, roundpoints: 10 }]));

    expect(h.runtime.state.getPlayerRound("p1")).toMatchObject({
      login: "p1",
      matchPoints: 50,
      roundPoints: 10,
      finalist: true,
    });
    expect(endRound).toHaveBeenCalled();
    expect(h.session.scriptCalls.at(-1)?.method).toBe("Maniaplanet.Pause.GetStatus");
  });

  it("saves round results on PreEndRound", async () => {
    const h = await createHarness();
    await h.script("Maniaplanet.StartRound_Start");
    await h.script(
      "Trackmania.Scores",
      scores("PreEndRound", [{ login: "p1", prevracetime: 31000, roundpoints: 6 }]),
    );
    expect(h.records.saved).toEqual([
      expect.objectContaining({ login: "p1", time: 31000, points: 6, round: 1 }),
    ]);
  });

  it("rebuilds the scoreboard from our own score requests", async () => {
    const h = await createHarness({ players: [player("p1")] });
    await h.script(
      "Trackmania.Scores",
      scores("", [{ login: "p1", accountid: "acc-1", matchpoints: 20, name: "P1" }], "gocontrolpanel"),
    );
    expect(h.runtime.state.getPlayerRound("p1")).toMatchObject({ accountId: "acc-1", matchPoints: 20, connected: true });
    expect(h.runtime.state.liveInfo.activeRound.players.p1.accountId).toBe("acc-1");
  });

  it("undoes the round count when a pause toggles mid-match", async () => {
    const h = await createHarness();
    h.runtime.state.roundNumber = 3;
    await h.script("Maniaplanet.Pause.Status", { responseid: "gocontrolpanel", available: true, active: true });
    expect(h.runtime.state.roundNumber).toBe(2);
    expect(h.runtime.state.liveInfo).toMatchObject({ isPaused: true, pauseAvailable: true });

    await h.script("Maniaplanet.Pause.Status", { responseid: "someone-else", available: true, active: false });
    expect(h.runtime.state.liveInfo.isPaused).toBe(true);
  });

  it("marks eliminated players by account id", async () => {
    const h = await createHarness();
    h.runtime.state.patchPlayer("p1", { login: "p1", accountId: "acc-1" });
    await h.script("Trackmania.Knockout.Elimination", { accountids: ["acc-1"] });
    expect(h.runtime.state.getPlayerRound("p1")?.eliminated).toBe(true);
  });
});

describe("maps and matches", () => {
  it("syncs a new map on BeginMap and resets the round counter", async () => {
    const h = await createHarness();
    h.runtime.state.roundNumber = 4;
    h.world.currentMap = MAP_B;

    await h.callback("ManiaPlanet.BeginMap", [MAP_B]);

    expect(h.runtime.state.liveInfo.currentMap).toBe(MAP_B.UId);
    expect(h.runtime.state.roundNumber).toBe(0);
    expect(h.maps.maps.has(MAP_B.UId)).toBe(true);
    expect(h.runtime.state.activeMapRecord?.uid).toBe(MAP_B.UId);
  });

  it("creates a new match on BeginMatch", async () => {
    const h = await createHarness();
    const beginMatch = vi.fn();
    h.runtime.events.on("beginMatch", beginMatch);
    await h.callback("ManiaPlanet.BeginMatch", []);
    expect(h.matches.matches).toHaveLength(2);
    expect(beginMatch).toHaveBeenCalled();
  });

  it("queues the next jukebox map on the podium", async () => {
    const h = await createHarness();
    h.jukebox.queues.set("server-1", [{ fileName: "Campaigns/MapB.Map.Gbx" }, { fileName: "Other.Map.Gbx" }]);

    await h.script("Maniaplanet.Podium_Start");

    expect(h.session.callsTo("ChooseNextMap")[0].params).toEqual(["Campaigns/MapB.Map.Gbx"]);
    expect(h.jukebox.queues.get("server-1")).toEqual([{ fileName: "Other.Map.Gbx" }]);
  });

  it("keeps the jukebox entry when the server rejects it", async () => {
    const h = await createHarness({
      configure: (s) =>
        s.respond("ChooseNextMap", () => {
          throw new Error("unknown map");
        }),
    });
    h.jukebox.queues.set("server-1", [{ fileName: "Gone.Map.Gbx" }]);
    await h.script("Maniaplanet.Podium_Start");
    expect(h.jukebox.queues.get("server-1")).toHaveLength(1);
  });

  it("keeps the current mode through the podium and announces a change at the next match", async () => {
    const h = await createHarness();
    const modeChange = vi.fn();
    h.runtime.events.on("modeChange", modeChange);
    const before = h.runtime.state.liveInfo.type;

    h.world.scriptName = "Trackmania/TM_TimeAttack_Online.Script.txt";
    await h.script("Maniaplanet.Podium_Start");
    expect(h.runtime.state.liveInfo.type).toBe(before);
    expect(modeChange).not.toHaveBeenCalled();

    await h.callback("ManiaPlanet.BeginMatch", []);

    expect(modeChange).toHaveBeenCalledWith("timeattack");
    expect(h.runtime.state.roundNumber).toBeNull();
  });

  it("refreshes script settings on the UpdatedSettings echo", async () => {
    const h = await createHarness();
    h.world.scriptSettings = { S_PointsLimit: 120 };
    const updated = vi.fn();
    h.runtime.events.on("updatedSettings", updated);

    await h.callback("ManiaPlanet.Echo", ["UpdatedSettings", ""]);

    expect(h.runtime.state.liveInfo.pointsLimit).toBe(120);
    expect(updated).toHaveBeenCalled();
  });
});

describe("chat", () => {
  it("forwards chat events with the nickname", async () => {
    const h = await createHarness({ players: [player("p1")] });
    const chat = vi.fn();
    h.runtime.events.on("playerChat", chat);
    await h.chat("p1", "gg");
    expect(chat).toHaveBeenCalledWith(expect.objectContaining({ Login: "p1", Text: "gg", Name: "Nick p1" }));
  });

  it("re-sends chat in the configured format with manual routing", async () => {
    const h = await createHarness({
      players: [player("p1")],
      server: { chat: { ...serverRecord().chat, manualRouting: true, messageFormat: "<{nickName}> {message}" } },
    });
    await h.chat("p1", "gg");
    expect(h.session.callsTo("ChatSendServerMessage").at(-1)?.params).toEqual(["<Nick p1> gg"]);
  });

  it("forwards unformatted chat with manual routing and no format", async () => {
    const h = await createHarness({
      players: [player("p1")],
      server: { chat: { ...serverRecord().chat, manualRouting: true } },
    });
    await h.chat("p1", "gg");
    expect(h.session.callsTo("ChatForwardToLogin")[0].params).toEqual(["gg", "p1", ""]);
  });

  it("answers /help with the plugin list", async () => {
    const h = await createHarness({ players: [player("p1")] });
    await h.chat("p1", "/help");
    expect(h.session.callsTo("ChatSendServerMessageToLogin")[0].params[1]).toBe("p1");
  });
});
