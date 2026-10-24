import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  ban: vi.fn(),
  unban: vi.fn(),
  cleanBans: vi.fn(),
  spectator: vi.fn(),
  blacklist: vi.fn(),
  unblacklist: vi.fn(),
  addGuest: vi.fn(),
  removeGuest: vi.fn(),
  listFile: vi.fn(),
  cleanList: vi.fn(),
  listed: vi.fn(),
  connectFake: vi.fn(),
  disconnectFake: vi.fn(),
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
  banPlayerAs: mocks.ban,
  unbanPlayerAs: mocks.unban,
  cleanBanListAs: mocks.cleanBans,
  forceSpectatorAs: mocks.spectator,
  blacklistPlayerAs: mocks.blacklist,
  unblacklistPlayerAs: mocks.unblacklist,
  addGuestAs: mocks.addGuest,
  removeGuestAs: mocks.removeGuest,
  playerListFileAs: mocks.listFile,
  cleanPlayerListAs: mocks.cleanList,
}));
vi.mock("@/actions/gbx/server-only/advanced", () => ({
  connectFakePlayerAs: mocks.connectFake,
  disconnectFakePlayerAs: mocks.disconnectFake,
}));
vi.mock("@/services/gbx/player", () => ({
  getListedPlayersAs: mocks.listed,
}));

import * as banRoute from "@/app/api/v1/servers/[serverId]/bans/[login]/route";
import * as bansRoute from "@/app/api/v1/servers/[serverId]/bans/route";
import * as blacklistLoginRoute from "@/app/api/v1/servers/[serverId]/blacklist/[login]/route";
import * as blacklistLoadRoute from "@/app/api/v1/servers/[serverId]/blacklist/load/route";
import * as blacklistRoute from "@/app/api/v1/servers/[serverId]/blacklist/route";
import * as fakePlayerRoute from "@/app/api/v1/servers/[serverId]/fake-players/[login]/route";
import * as fakePlayersRoute from "@/app/api/v1/servers/[serverId]/fake-players/route";
import * as guestlistLoginRoute from "@/app/api/v1/servers/[serverId]/guestlist/[login]/route";
import * as guestlistRoute from "@/app/api/v1/servers/[serverId]/guestlist/route";
import * as guestlistSaveRoute from "@/app/api/v1/servers/[serverId]/guestlist/save/route";
import * as playerBanRoute from "@/app/api/v1/servers/[serverId]/players/[login]/ban/route";
import * as spectatorRoute from "@/app/api/v1/servers/[serverId]/players/[login]/spectator/route";
import { actor, onA, principal, req } from "./helpers/public-api";

beforeEach(() => {
  mocks.authenticate.mockResolvedValue(principal());
});

describe("v1 player moderation", () => {
  it("bans with a reason, which may be left out", async () => {
    let res = await playerBanRoute.POST(
      req("/servers/server-a/players/p1/ban", {
        method: "POST",
        body: { reason: "cheating" },
      }),
      onA({ login: "p1" }),
    );
    expect(res.status).toBe(204);
    expect(mocks.ban).toHaveBeenCalledWith(actor, "server-a", "p1", "cheating");

    res = await playerBanRoute.POST(
      req("/servers/server-a/players/p1/ban", { method: "POST" }),
      onA({ login: "p1" }),
    );
    expect(res.status).toBe(204);
    expect(mocks.ban).toHaveBeenLastCalledWith(actor, "server-a", "p1", "");
  });

  it("maps spectator modes to the server's status values", async () => {
    for (const [mode, status] of [
      ["selectable", 0],
      ["spectator", 1],
      ["player", 2],
      ["spectatorSelectable", 3],
    ] as const) {
      const res = await spectatorRoute.POST(
        req("/servers/server-a/players/p1/spectator", {
          method: "POST",
          body: { mode },
        }),
        onA({ login: "p1" }),
      );
      expect(res.status).toBe(204);
      expect(mocks.spectator).toHaveBeenLastCalledWith(
        actor,
        "server-a",
        "p1",
        status,
      );
    }

    const res = await spectatorRoute.POST(
      req("/servers/server-a/players/p1/spectator", {
        method: "POST",
        body: { mode: 1 },
      }),
      onA({ login: "p1" }),
    );
    expect(res.status).toBe(400);
  });

  it("lists, lifts and clears bans", async () => {
    mocks.listed.mockResolvedValue([
      {
        login: "p1",
        nickName: "One",
        playerId: 1,
        spectatorStatus: 0,
        teamId: 0,
      },
    ]);
    let res = await bansRoute.GET(req("/servers/server-a/bans"), onA());
    expect(mocks.listed).toHaveBeenCalledWith(actor, "server-a", "banlist");
    expect(await res.json()).toEqual({
      data: [{ login: "p1", nickName: "One" }],
    });

    res = await banRoute.DELETE(
      req("/servers/server-a/bans/p1", { method: "DELETE" }),
      onA({ login: "p1" }),
    );
    expect(res.status).toBe(204);
    expect(mocks.unban).toHaveBeenCalledWith(actor, "server-a", "p1");

    res = await bansRoute.DELETE(
      req("/servers/server-a/bans", { method: "DELETE" }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.cleanBans).toHaveBeenCalledWith(actor, "server-a");
  });
});

describe("v1 blacklist and guestlist", () => {
  it("reads each list by name", async () => {
    mocks.listed.mockResolvedValue([]);
    await blacklistRoute.GET(req("/servers/server-a/blacklist"), onA());
    expect(mocks.listed).toHaveBeenLastCalledWith(
      actor,
      "server-a",
      "blacklist",
    );
    await guestlistRoute.GET(req("/servers/server-a/guestlist"), onA());
    expect(mocks.listed).toHaveBeenLastCalledWith(
      actor,
      "server-a",
      "guestlist",
    );
  });

  it("adds and removes players", async () => {
    const login = onA({ login: "p1" });
    await blacklistLoginRoute.PUT(
      req("/servers/server-a/blacklist/p1", { method: "PUT" }),
      login,
    );
    await blacklistLoginRoute.DELETE(
      req("/servers/server-a/blacklist/p1", { method: "DELETE" }),
      login,
    );
    await guestlistLoginRoute.PUT(
      req("/servers/server-a/guestlist/p1", { method: "PUT" }),
      login,
    );
    await guestlistLoginRoute.DELETE(
      req("/servers/server-a/guestlist/p1", { method: "DELETE" }),
      login,
    );
    for (const fn of [
      mocks.blacklist,
      mocks.unblacklist,
      mocks.addGuest,
      mocks.removeGuest,
    ]) {
      expect(fn).toHaveBeenCalledWith(actor, "server-a", "p1");
    }
  });

  it("clears a list", async () => {
    const res = await guestlistRoute.DELETE(
      req("/servers/server-a/guestlist", { method: "DELETE" }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.cleanList).toHaveBeenCalledWith(
      actor,
      "server-a",
      "guestlist",
    );
  });

  it("loads and saves list files", async () => {
    let res = await blacklistLoadRoute.POST(
      req("/servers/server-a/blacklist/load", {
        method: "POST",
        body: { filename: "lists/blacklist.txt" },
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.listFile).toHaveBeenLastCalledWith(
      actor,
      "server-a",
      "blacklist",
      "load",
      "lists/blacklist.txt",
    );

    res = await guestlistSaveRoute.POST(
      req("/servers/server-a/guestlist/save", {
        method: "POST",
        body: { filename: "guestlist.xml" },
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.listFile).toHaveBeenLastCalledWith(
      actor,
      "server-a",
      "guestlist",
      "save",
      "guestlist.xml",
    );
  });

  it("rejects absolute and traversing filenames before calling the server", async () => {
    mocks.listFile.mockClear();
    for (const filename of ["/etc/passwd.txt", "../secret.txt", "a.exe"]) {
      const res = await blacklistLoadRoute.POST(
        req("/servers/server-a/blacklist/load", {
          method: "POST",
          body: { filename },
        }),
        onA(),
      );
      expect(res.status, filename).toBe(400);
    }
    expect(mocks.listFile).not.toHaveBeenCalled();
  });

  it("needs players:write to change a list", async () => {
    mocks.authenticate.mockResolvedValue(principal(["players:read"]));
    mocks.blacklist.mockClear();
    const res = await blacklistLoginRoute.PUT(
      req("/servers/server-a/blacklist/p1", { method: "PUT" }),
      onA({ login: "p1" }),
    );
    expect(res.status).toBe(403);
    expect(mocks.blacklist).not.toHaveBeenCalled();
  });
});

describe("v1 fake players", () => {
  it("connects one and returns its login", async () => {
    mocks.connectFake.mockResolvedValue("*fakeplayer1*");
    const res = await fakePlayersRoute.POST(
      req("/servers/server-a/fake-players", { method: "POST" }),
      onA(),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ data: { login: "*fakeplayer1*" } });
  });

  it("disconnects one, or all with *", async () => {
    for (const login of ["*fakeplayer1*", "*"]) {
      const res = await fakePlayerRoute.DELETE(
        req(`/servers/server-a/fake-players/${login}`, { method: "DELETE" }),
        onA({ login }),
      );
      expect(res.status).toBe(204);
      expect(mocks.disconnectFake).toHaveBeenLastCalledWith(
        actor,
        "server-a",
        login,
      );
    }
  });
});
