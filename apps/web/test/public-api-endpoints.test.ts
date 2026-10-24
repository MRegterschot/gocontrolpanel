import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  kick: vi.fn(),
  addTmx: vi.fn(),
  addToJukebox: vi.fn(),
  clearJukebox: vi.fn(),
  jukebox: vi.fn(),
  mapList: vi.fn(),
  players: vi.fn(),
  matchesPage: vi.fn(),
  match: vi.fn(),
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
vi.mock("@/actions/gbx/server-only/player", () => ({
  kickPlayerAs: mocks.kick,
}));
vi.mock("@/actions/tmx/server-only/maps", () => ({
  addTmxMapToServerAs: mocks.addTmx,
}));
vi.mock("@/actions/gbx/server-only/map", () => ({
  addMapToJukeboxAs: mocks.addToJukebox,
  clearJukeboxAs: mocks.clearJukebox,
}));
vi.mock("@/services/gbx/map", () => ({ getJukeboxAs: mocks.jukebox }));
vi.mock("@/services/gbx/player", () => ({ getPlayerListAs: mocks.players }));
vi.mock("@/services/database/maps", () => ({ getMapListAs: mocks.mapList }));
vi.mock("@/services/database/matches", () => ({
  getMatchesPageAs: mocks.matchesPage,
  getMatchAs: mocks.match,
}));

import * as jukeboxRoute from "@/app/api/v1/servers/[serverId]/jukebox/route";
import * as mapsRoute from "@/app/api/v1/servers/[serverId]/maps/route";
import * as tmxRoute from "@/app/api/v1/servers/[serverId]/maps/tmx/route";
import * as matchRoute from "@/app/api/v1/servers/[serverId]/matches/[matchId]/route";
import * as matchesRoute from "@/app/api/v1/servers/[serverId]/matches/route";
import * as kickRoute from "@/app/api/v1/servers/[serverId]/players/[login]/kick/route";
import * as playersRoute from "@/app/api/v1/servers/[serverId]/players/route";
import * as serverRoute from "@/app/api/v1/servers/[serverId]/route";
import * as serversRoute from "@/app/api/v1/servers/route";
import { ServerError } from "@/types/responses";
import { API_KEY_SCOPES } from "@gcp/shared";
import { publicApiEndpoints } from "@gcp/shared/public-api";
import { NextRequest } from "next/server";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const V1 = path.resolve(__dirname, "../src/app/api/v1");
const serverA = { id: "server-a", name: "A", description: "a" };
const serverB = { id: "server-b", name: "B", description: "b" };
const actor = { userId: "user-1", login: "creator", apiKeyId: "key-1" };

const map = {
  id: "map-1",
  uid: "uid-1",
  name: "$f00Red",
  fileName: "Red.Map.Gbx",
  author: "author-login",
  authorNickname: "Author",
  authorTime: 30000,
  goldTime: 32000,
  silverTime: 36000,
  bronzeTime: 45000,
  submitter: null,
  timestamp: null,
  fileUrl: null,
  thumbnailUrl: null,
  uploadCheck: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};
const apiMap = {
  uid: "uid-1",
  name: "$f00Red",
  fileName: "Red.Map.Gbx",
  author: "author-login",
  authorNickname: "Author",
  medals: { author: 30000, gold: 32000, silver: 36000, bronze: 45000 },
};

function req(urlPath: string, init: { method?: string; body?: unknown } = {}) {
  return new NextRequest(`http://localhost/api/v1${urlPath}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { authorization: "Bearer gcp_x" },
  });
}

const ctx = (params: Record<string, string> = {}) => ({
  params: Promise.resolve(params),
});
const onA = (extra: Record<string, string> = {}) =>
  ctx({ serverId: "server-a", ...extra });

beforeEach(() => {
  mocks.authenticate.mockResolvedValue({
    keyId: "key-1",
    name: "Bot",
    scopes: [...API_KEY_SCOPES],
    target: { type: "group", groupId: "group-1" },
    servers: [serverA, serverB],
    actor,
  });
});

// Route files under /api/v1, as "METHOD /path" with OpenAPI-style params
function routeFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") {
        const route =
          "/" +
          path
            .relative(V1, path.dirname(full))
            .split(path.sep)
            .map((s) => s.replace(/^\[(\w+)\]$/, "{$1}"))
            .join("/");
        const source = readFileSync(full, "utf8");
        for (const m of source.matchAll(
          /export const (GET|POST|PUT|PATCH|DELETE) = publicApiRoute\(\s*(\w+)/g,
        )) {
          found.push(`${m[1].toLowerCase()} ${route} ${m[2]}`);
        }
      }
    }
  };
  walk(V1);
  return found.sort();
}

describe("v1 routes", () => {
  it("implement exactly the contract, each with its own endpoint", () => {
    expect(routeFiles()).toEqual(
      publicApiEndpoints.map((e) => `${e.method} ${e.path} ${e.id}`).sort(),
    );
  });

  it("all go through publicApiRoute, apart from the documentation", () => {
    const exported = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return exported(full);
        if (entry.name !== "route.ts") return [];
        return [
          ...readFileSync(full, "utf8").matchAll(
            /export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)\b/g,
          ),
        ].map((m) => `${path.dirname(path.relative(V1, full))} ${m[1]}`);
      });
    const docs = [
      "openapi.json GET",
      `docs GET`,
      `${path.join("docs", "scalar.js")} GET`,
    ];
    const routes = exported(V1);
    expect(routes).toEqual(expect.arrayContaining(docs));
    expect(routes.length).toBe(publicApiEndpoints.length + docs.length);
  });
});

describe("v1 permissions", () => {
  // Group keys carry groups:<id>:admin; no v1 route may treat that as group management
  it("never check group management permissions", () => {
    const sources = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory()
          ? sources(full)
          : [readFileSync(full, "utf8")];
      });
    for (const source of sources(V1)) {
      expect(source).not.toMatch(/["'`]groups:/);
    }
  });
});

describe("v1 handlers", () => {
  it("lists the servers the key reaches", async () => {
    const res = await serversRoute.GET(req("/servers"), ctx());
    expect(await res.json()).toEqual({ data: [serverA, serverB] });
  });

  it("gets one reachable server", async () => {
    const res = await serverRoute.GET(
      req("/servers/server-b"),
      ctx({ serverId: "server-b" }),
    );
    expect(await res.json()).toEqual({ data: serverB });
  });

  it("maps players to the public shape", async () => {
    mocks.players.mockResolvedValue([
      {
        login: "p1",
        nickName: "One",
        playerId: 1,
        teamId: -1,
        spectatorStatus: 0,
      },
      {
        login: "p2",
        nickName: "Two",
        playerId: 2,
        teamId: 0,
        spectatorStatus: 2551101,
      },
    ]);
    const res = await playersRoute.GET(req("/servers/server-a/players"), onA());
    expect(mocks.players).toHaveBeenCalledWith(actor, "server-a");
    expect(await res.json()).toEqual({
      data: [
        {
          login: "p1",
          nickName: "One",
          playerId: 1,
          teamId: -1,
          spectator: false,
        },
        {
          login: "p2",
          nickName: "Two",
          playerId: 2,
          teamId: 0,
          spectator: true,
        },
      ],
    });
  });

  it("kicks with the given reason", async () => {
    const res = await kickRoute.POST(
      req("/servers/server-a/players/p1/kick", {
        method: "POST",
        body: { reason: "afk" },
      }),
      onA({ login: "p1" }),
    );
    expect(res.status).toBe(204);
    expect(mocks.kick).toHaveBeenCalledWith(actor, "server-a", "p1", "afk");
  });

  it("lists maps with offset and limit, and an empty list as empty", async () => {
    mocks.mapList.mockResolvedValue([{ ...map, path: "Red.Map.Gbx" }]);
    let res = await mapsRoute.GET(
      req("/servers/server-a/maps?offset=5&limit=10"),
      onA(),
    );
    expect(mocks.mapList).toHaveBeenCalledWith(actor, "server-a", 10, 5);
    expect(await res.json()).toEqual({ data: [apiMap] });

    mocks.mapList.mockRejectedValue(new ServerError("empty", "MapListEmpty"));
    res = await mapsRoute.GET(req("/servers/server-a/maps"), onA());
    expect(await res.json()).toEqual({ data: [] });
  });

  it("adds a TMX map", async () => {
    mocks.addTmx.mockResolvedValue("Downloaded/123.Map.Gbx");
    const res = await tmxRoute.POST(
      req("/servers/server-a/maps/tmx", {
        method: "POST",
        body: { mapId: 123 },
      }),
      onA(),
    );
    expect(res.status).toBe(201);
    expect(mocks.addTmx).toHaveBeenCalledWith(actor, "server-a", 123);
    expect(await res.json()).toEqual({
      data: { path: "Downloaded/123.Map.Gbx" },
    });
  });

  describe("jukebox", () => {
    const entry = {
      ...map,
      QueuedBy: "creator",
      QueuedByDisplayName: "Bot (API key)",
      QueuedAt: "2026-10-21T12:00:00.000Z",
    };

    it("lists entries", async () => {
      mocks.jukebox.mockResolvedValue([entry]);
      const res = await jukeboxRoute.GET(
        req("/servers/server-a/jukebox"),
        onA(),
      );
      expect(await res.json()).toEqual({
        data: [
          {
            map: apiMap,
            queuedBy: { login: "creator", displayName: "Bot (API key)" },
            queuedAt: "2026-10-21T12:00:00.000Z",
          },
        ],
      });
    });

    it("queues a map from the server's map list, without its path", async () => {
      mocks.mapList.mockResolvedValue([{ ...map, path: "Red.Map.Gbx" }]);
      mocks.addToJukebox.mockResolvedValue({
        ...entry,
        QueuedAt: new Date(entry.QueuedAt),
      });

      const res = await jukeboxRoute.POST(
        req("/servers/server-a/jukebox", {
          method: "POST",
          body: { uid: "uid-1" },
        }),
        onA(),
      );

      expect(res.status).toBe(201);
      expect(mocks.addToJukebox).toHaveBeenCalledWith(actor, "server-a", map);
    });

    it("refuses a map that is not on the server", async () => {
      mocks.mapList.mockResolvedValue([{ ...map, path: "Red.Map.Gbx" }]);
      const res = await jukeboxRoute.POST(
        req("/servers/server-a/jukebox", {
          method: "POST",
          body: { uid: "elsewhere" },
        }),
        onA(),
      );
      expect(res.status).toBe(404);
      expect(mocks.addToJukebox).not.toHaveBeenCalled();
    });

    it("passes other map list failures through", async () => {
      mocks.mapList.mockRejectedValue(
        new ServerError("Offline", "ServerNotConnected"),
      );
      const res = await jukeboxRoute.POST(
        req("/servers/server-a/jukebox", {
          method: "POST",
          body: { uid: "uid-1" },
        }),
        onA(),
      );
      expect(res.status).toBe(503);
    });

    it("clears", async () => {
      const res = await jukeboxRoute.DELETE(
        req("/servers/server-a/jukebox", { method: "DELETE" }),
        onA(),
      );
      expect(res.status).toBe(204);
      expect(mocks.clearJukebox).toHaveBeenCalledWith(actor, "server-a");
    });
  });

  describe("matches", () => {
    const match = {
      id: "match-1",
      mode: "Trackmania/TM_Rounds_Online.Script.txt",
      map: { uid: "uid-1", name: "Red" },
      _count: { records: 2 },
      createdAt: new Date("2026-10-20T10:00:00Z"),
    };

    it("pages newest first", async () => {
      mocks.matchesPage.mockResolvedValue({ matches: [match], total: 41 });
      const res = await matchesRoute.GET(
        req("/servers/server-a/matches?page=3&pageSize=20"),
        onA(),
      );
      expect(mocks.matchesPage).toHaveBeenCalledWith(actor, "server-a", 3, 20);
      expect(await res.json()).toEqual({
        data: [
          {
            id: "match-1",
            mode: "Trackmania/TM_Rounds_Online.Script.txt",
            map: { uid: "uid-1", name: "Red" },
            recordCount: 2,
            createdAt: "2026-10-20T10:00:00.000Z",
          },
        ],
        pagination: { page: 3, pageSize: 20, total: 41 },
      });
    });

    it("gets one with its records", async () => {
      mocks.match.mockResolvedValue({
        ...match,
        records: [
          {
            login: "p1",
            user: { nickName: "One" },
            time: 30500,
            round: 1,
            points: 10,
          },
          { login: null, user: null, time: -1, round: 1, points: null },
        ],
      });
      const res = await matchRoute.GET(
        req("/servers/server-a/matches/match-1"),
        onA({ matchId: "match-1" }),
      );
      expect(mocks.match).toHaveBeenCalledWith(actor, "server-a", "match-1");
      expect((await res.json()).data.records).toEqual([
        { login: "p1", nickName: "One", time: 30500, round: 1, points: 10 },
        { login: null, nickName: null, time: -1, round: 1, points: null },
      ]);
    });

    it("answers 404 for another server's match", async () => {
      mocks.match.mockResolvedValue(null);
      const res = await matchRoute.GET(
        req("/servers/server-a/matches/match-9"),
        onA({ matchId: "match-9" }),
      );
      expect(res.status).toBe(404);
    });
  });
});
