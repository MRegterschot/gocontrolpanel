import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  scriptName: vi.fn(),
  showOpponents: vi.fn(),
  scriptInfo: vi.fn(),
  scriptSettings: vi.fn(),
  setScript: vi.fn(),
  setSettings: vi.fn(),
  restart: vi.fn(),
  next: vi.fn(),
  pause: vi.fn(),
  setOpponents: vi.fn(),
  scriptEvent: vi.fn(),
  matchSettings: vi.fn(),
  jump: vi.fn(),
  mapList: vi.fn(),
  points: {
    playerRound: vi.fn(),
    playerMap: vi.fn(),
    playerMatch: vi.fn(),
    teamRound: vi.fn(),
    teamMap: vi.fn(),
    teamMatch: vi.fn(),
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/ratelimiter", () => ({
  takeRateLimitToken: async () => ({ allowed: true, retryAfterMs: 0 }),
}));
vi.mock("@/lib/api-keys/authenticate", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  authenticateApiKey: mocks.authenticate,
}));
vi.mock("@/services/gbx/game", () => ({
  getScriptNameAs: mocks.scriptName,
  getShowOpponentsAs: mocks.showOpponents,
  getModeScriptInfoAs: mocks.scriptInfo,
  getModeScriptSettingsAs: mocks.scriptSettings,
}));
vi.mock("@/actions/gbx/server-only/game", () => ({
  setScriptNameAs: mocks.setScript,
  setModeScriptSettingsAs: mocks.setSettings,
  restartMapAs: mocks.restart,
  nextMapAs: mocks.next,
  pauseMatchAs: mocks.pause,
  setShowOpponentsAs: mocks.setOpponents,
  triggerModeScriptEventAs: mocks.scriptEvent,
  matchSettingsFileAs: mocks.matchSettings,
}));
vi.mock("@/actions/gbx/server-only/map", () => ({
  jumpToMapIndexAs: mocks.jump,
}));
vi.mock("@/actions/gbx/server-only/player", () => ({
  setPlayerRoundPointsAs: mocks.points.playerRound,
  setPlayerMapPointsAs: mocks.points.playerMap,
  setPlayerMatchPointsAs: mocks.points.playerMatch,
  setTeamRoundPointsAs: mocks.points.teamRound,
  setTeamMapPointsAs: mocks.points.teamMap,
  setTeamMatchPointsAs: mocks.points.teamMatch,
}));
vi.mock("@/services/database/maps", () => ({ getMapListAs: mocks.mapList }));

import * as jumpRoute from "@/app/api/v1/servers/[serverId]/game/jump/route";
import * as appendRoute from "@/app/api/v1/servers/[serverId]/game/match-settings/append/route";
import * as insertRoute from "@/app/api/v1/servers/[serverId]/game/match-settings/insert/route";
import * as loadRoute from "@/app/api/v1/servers/[serverId]/game/match-settings/load/route";
import * as saveRoute from "@/app/api/v1/servers/[serverId]/game/match-settings/save/route";
import * as nextRoute from "@/app/api/v1/servers/[serverId]/game/next/route";
import * as pauseRoute from "@/app/api/v1/servers/[serverId]/game/pause/route";
import * as restartRoute from "@/app/api/v1/servers/[serverId]/game/restart/route";
import * as gameRoute from "@/app/api/v1/servers/[serverId]/game/route";
import * as scriptEventsRoute from "@/app/api/v1/servers/[serverId]/game/script-events/route";
import * as scriptSettingsRoute from "@/app/api/v1/servers/[serverId]/game/script-settings/route";
import * as scriptRoute from "@/app/api/v1/servers/[serverId]/game/script/route";
import * as opponentsRoute from "@/app/api/v1/servers/[serverId]/game/show-opponents/route";
import * as playerPointsRoute from "@/app/api/v1/servers/[serverId]/players/[login]/points/route";
import * as teamPointsRoute from "@/app/api/v1/servers/[serverId]/teams/[teamId]/points/route";
import { actor, onA, principal, req } from "./helpers/public-api";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue(principal());
});

const send = (method: string, path: string, body?: unknown) =>
  req(`/servers/server-a${path}`, { method, body });

describe("v1 game reads", () => {
  it("combines the script name and opponent visibility", async () => {
    mocks.scriptName.mockResolvedValue({
      CurrentValue: "TM_Rounds_Online.Script.txt",
      NextValue: "TM_Cup_Online.Script.txt",
    });
    mocks.showOpponents.mockResolvedValue({ CurrentValue: 0, NextValue: 1 });
    const res = await gameRoute.GET(send("GET", "/game"), onA());
    expect(await res.json()).toEqual({
      data: {
        script: {
          current: "TM_Rounds_Online.Script.txt",
          next: "TM_Cup_Online.Script.txt",
        },
        showOpponents: { current: 0, next: 1 },
      },
    });
  });

  it("describes the script with its settings and commands", async () => {
    mocks.scriptInfo.mockResolvedValue({
      Name: "TM_Rounds_Online",
      CompatibleMapTypes: "TrackMania\\TM_Race",
      Description: "Rounds",
      Version: "2026-01-01",
      ParamDescs: [
        {
          Name: "S_PointsLimit",
          Desc: "Limit",
          Type: "integer",
          Default: "50",
        },
      ],
      CommandDescs: [],
    });
    const res = await scriptRoute.GET(send("GET", "/game/script"), onA());
    expect(await res.json()).toEqual({
      data: {
        name: "TM_Rounds_Online",
        description: "Rounds",
        version: "2026-01-01",
        compatibleMapTypes: "TrackMania\\TM_Race",
        settings: [
          {
            name: "S_PointsLimit",
            description: "Limit",
            type: "integer",
            default: "50",
          },
        ],
        commands: [],
      },
    });
  });

  it("returns the script settings as they are", async () => {
    mocks.scriptSettings.mockResolvedValue({ S_TimeLimit: 300, S_X: true });
    const res = await scriptSettingsRoute.GET(
      send("GET", "/game/script-settings"),
      onA(),
    );
    expect(await res.json()).toEqual({
      data: { S_TimeLimit: 300, S_X: true },
    });
  });
});

describe("v1 game changes", () => {
  it("sets the script and rejects paths that are not scripts", async () => {
    let res = await scriptRoute.PUT(
      send("PUT", "/game/script", {
        script: "Trackmania/TM_TimeAttack_Online.Script.txt",
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.setScript).toHaveBeenCalledWith(
      actor,
      "server-a",
      "Trackmania/TM_TimeAttack_Online.Script.txt",
    );

    for (const script of ["../x.Script.txt", "x.txt"]) {
      res = await scriptRoute.PUT(
        send("PUT", "/game/script", { script }),
        onA(),
      );
      expect(res.status, script).toBe(400);
    }
    expect(mocks.setScript).toHaveBeenCalledTimes(1);
  });

  it("patches script settings, only S_ settings and at least one", async () => {
    let res = await scriptSettingsRoute.PATCH(
      send("PATCH", "/game/script-settings", {
        settings: { S_TimeLimit: 600, S_Name: "x", S_On: false },
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.setSettings).toHaveBeenCalledWith(actor, "server-a", {
      S_TimeLimit: 600,
      S_Name: "x",
      S_On: false,
    });

    for (const settings of [{}, { TimeLimit: 1 }, { S_X: { nested: 1 } }]) {
      res = await scriptSettingsRoute.PATCH(
        send("PATCH", "/game/script-settings", { settings }),
        onA(),
      );
      expect(res.status, JSON.stringify(settings)).toBe(400);
    }
    expect(mocks.setSettings).toHaveBeenCalledTimes(1);
  });

  it("restarts, skips, pauses and sets opponent visibility", async () => {
    await restartRoute.POST(send("POST", "/game/restart"), onA());
    await nextRoute.POST(send("POST", "/game/next"), onA());
    await pauseRoute.PUT(send("PUT", "/game/pause", { paused: true }), onA());
    await opponentsRoute.PUT(
      send("PUT", "/game/show-opponents", { count: 1 }),
      onA(),
    );
    expect(mocks.restart).toHaveBeenCalledWith(actor, "server-a");
    expect(mocks.next).toHaveBeenCalledWith(actor, "server-a");
    expect(mocks.pause).toHaveBeenCalledWith(actor, "server-a", true);
    expect(mocks.setOpponents).toHaveBeenCalledWith(actor, "server-a", 1);
  });

  it("jumps to a map by its position on the map list", async () => {
    mocks.mapList.mockResolvedValue([
      { uid: "a", path: "a.Map.Gbx" },
      { uid: "b", path: "b.Map.Gbx" },
    ]);
    let res = await jumpRoute.POST(
      send("POST", "/game/jump", { uid: "b" }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.jump).toHaveBeenCalledWith(actor, "server-a", 1);

    res = await jumpRoute.POST(send("POST", "/game/jump", { uid: "x" }), onA());
    expect(res.status).toBe(404);
  });

  it("sends script events, with no parameters by default", async () => {
    const res = await scriptEventsRoute.POST(
      send("POST", "/game/script-events", {
        method: "Trackmania.ForceEndRound",
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.scriptEvent).toHaveBeenCalledWith(
      actor,
      "server-a",
      "Trackmania.ForceEndRound",
      [],
    );
  });

  it("routes each match settings operation", async () => {
    const filename = "MatchSettings/tracklist.txt";
    for (const [route, operation] of [
      [loadRoute, "load"],
      [saveRoute, "save"],
      [appendRoute, "append"],
      [insertRoute, "insert"],
    ] as const) {
      const res = await route.POST(
        send("POST", `/game/match-settings/${operation}`, { filename }),
        onA(),
      );
      expect(res.status).toBe(204);
      expect(mocks.matchSettings).toHaveBeenLastCalledWith(
        actor,
        "server-a",
        operation,
        filename,
      );
    }
  });

  it("sets player and team points by type", async () => {
    await playerPointsRoute.PUT(
      send("PUT", "/players/p1/points", { type: "match", points: 12 }),
      onA({ login: "p1" }),
    );
    expect(mocks.points.playerMatch).toHaveBeenCalledWith(
      actor,
      "server-a",
      "p1",
      12,
    );

    await teamPointsRoute.PUT(
      send("PUT", "/teams/1/points", { type: "round", points: 3 }),
      onA({ teamId: "1" }),
    );
    expect(mocks.points.teamRound).toHaveBeenCalledWith(
      actor,
      "server-a",
      1,
      3,
    );
  });

  it("needs game:write, and players:write is not enough", async () => {
    mocks.authenticate.mockResolvedValue(
      principal(["game:read", "players:write"]),
    );
    const res = await playerPointsRoute.PUT(
      send("PUT", "/players/p1/points", { type: "round", points: 1 }),
      onA({ login: "p1" }),
    );
    expect(res.status).toBe(403);
    expect(mocks.points.playerRound).not.toHaveBeenCalled();
  });
});
