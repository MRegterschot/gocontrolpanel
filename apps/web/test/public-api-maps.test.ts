import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  mapList: vi.fn(),
  localMaps: vi.fn(),
  currentMaps: vi.fn(),
  jukebox: vi.fn(),
  addMaps: vi.fn(),
  removeMaps: vi.fn(),
  reorderMaps: vi.fn(),
  removeFromJukebox: vi.fn(),
  setJukebox: vi.fn(),
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
vi.mock("@/services/database/maps", () => ({ getMapListAs: mocks.mapList }));
vi.mock("@/services/gbx/server", () => ({ getLocalMapsAs: mocks.localMaps }));
vi.mock("@/services/gbx/map", () => ({
  getCurrentMapsAs: mocks.currentMaps,
  getJukeboxAs: mocks.jukebox,
}));
vi.mock("@/actions/gbx/server-only/map", () => ({
  addMapsAs: mocks.addMaps,
  removeMapsAs: mocks.removeMaps,
  reorderMapsAs: mocks.reorderMaps,
  removeFromJukeboxAs: mocks.removeFromJukebox,
  setJukeboxAs: mocks.setJukebox,
}));

import * as jukeboxMapRoute from "@/app/api/v1/servers/[serverId]/jukebox/[uid]/route";
import * as jukeboxOrderRoute from "@/app/api/v1/servers/[serverId]/jukebox/order/route";
import * as currentRoute from "@/app/api/v1/servers/[serverId]/maps/current/route";
import * as filesRoute from "@/app/api/v1/servers/[serverId]/maps/files/route";
import * as orderRoute from "@/app/api/v1/servers/[serverId]/maps/order/route";
import * as removeRoute from "@/app/api/v1/servers/[serverId]/maps/remove/route";
import * as mapsRoute from "@/app/api/v1/servers/[serverId]/maps/route";
import { inUidOrder } from "@/lib/public-api/maps";
import { ServerError } from "@/types/responses";
import { actor, onA, principal, req } from "./helpers/public-api";

const row = (uid: string) => ({ id: `id-${uid}`, uid, path: `${uid}.Map.Gbx` });

const info = (uid: string) => ({
  UId: uid,
  Name: `Map ${uid}`,
  FileName: `Downloaded/${uid}.Map.Gbx`,
  Author: "author",
  AuthorNickname: "Author",
  AuthorTime: 1,
  GoldTime: 2,
  SilverTime: 3,
  BronzeTime: 4,
});
const apiInfo = (uid: string) => ({
  uid,
  name: `Map ${uid}`,
  fileName: `Downloaded/${uid}.Map.Gbx`,
  author: "author",
  authorNickname: "Author",
  medals: { author: 1, gold: 2, silver: 3, bronze: 4 },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue(principal());
  mocks.mapList.mockResolvedValue([row("a"), row("b"), row("c")]);
});

describe("inUidOrder", () => {
  const items = [{ uid: "a" }, { uid: "b" }, { uid: "a" }];

  it("reorders when every entry is listed once, duplicates included", () => {
    expect(
      inUidOrder(items, ["a", "a", "b"], (i) => i.uid).map((i) => i.uid),
    ).toEqual(["a", "a", "b"]);
  });

  it.each([
    ["misses an entry", ["a", "b"]],
    ["lists an entry too often", ["a", "b", "b"]],
    ["names an unknown map", ["a", "a", "x"]],
  ])("rejects a list that %s", (_, uids) => {
    expect(() => inUidOrder(items, uids, (i) => i.uid)).toThrow(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});

describe("v1 maps", () => {
  it("returns the current and next map from the server", async () => {
    mocks.currentMaps.mockResolvedValue({
      current: info("a"),
      next: info("b"),
    });
    const res = await currentRoute.GET(
      req("/servers/server-a/maps/current"),
      onA(),
    );
    expect(await res.json()).toEqual({
      data: { current: apiInfo("a"), next: apiInfo("b") },
    });
  });

  it("lists map files with their paths", async () => {
    mocks.localMaps.mockResolvedValue([{ ...info("x"), Path: "Downloaded" }]);
    const res = await filesRoute.GET(
      req("/servers/server-a/maps/files"),
      onA(),
    );
    expect(mocks.localMaps).toHaveBeenCalledWith(actor, "server-a");
    expect(await res.json()).toEqual({ data: [apiInfo("x")] });
  });

  it("adds map files and reports how many were added", async () => {
    mocks.addMaps.mockResolvedValue(2);
    const fileNames = ["Downloaded/x.Map.Gbx", "y.Map.Gbx"];
    const res = await mapsRoute.POST(
      req("/servers/server-a/maps", { method: "POST", body: { fileNames } }),
      onA(),
    );
    expect(mocks.addMaps).toHaveBeenCalledWith(actor, "server-a", fileNames);
    expect(await res.json()).toEqual({ data: { added: 2 } });
  });

  it("rejects map files outside the Maps folder", async () => {
    for (const fileName of ["../x.Map.Gbx", "/x.Map.Gbx", "x.txt"]) {
      const res = await mapsRoute.POST(
        req("/servers/server-a/maps", {
          method: "POST",
          body: { fileNames: [fileName] },
        }),
        onA(),
      );
      expect(res.status, fileName).toBe(400);
    }
    expect(mocks.addMaps).not.toHaveBeenCalled();
  });

  it("removes maps by UID through their server paths", async () => {
    const res = await removeRoute.POST(
      req("/servers/server-a/maps/remove", {
        method: "POST",
        body: { uids: ["c", "a", "c"] },
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.removeMaps).toHaveBeenCalledWith(actor, "server-a", [
      "c.Map.Gbx",
      "a.Map.Gbx",
    ]);
  });

  it("removes nothing when a UID is not on the map list", async () => {
    const res = await removeRoute.POST(
      req("/servers/server-a/maps/remove", {
        method: "POST",
        body: { uids: ["a", "x"] },
      }),
      onA(),
    );
    expect(res.status).toBe(404);
    expect(mocks.removeMaps).not.toHaveBeenCalled();
  });

  it("answers 409 when the service refuses to remove the last map", async () => {
    mocks.removeMaps.mockRejectedValue(
      new ServerError("Cannot remove the last map", "RemoveLastMapError"),
    );
    const res = await removeRoute.POST(
      req("/servers/server-a/maps/remove", {
        method: "POST",
        body: { uids: ["a", "b", "c"] },
      }),
      onA(),
    );
    expect(res.status).toBe(409);
  });

  it("reorders the whole map list", async () => {
    const res = await orderRoute.PUT(
      req("/servers/server-a/maps/order", {
        method: "PUT",
        body: { uids: ["c", "a", "b"] },
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.reorderMaps).toHaveBeenCalledWith(actor, "server-a", [
      "c.Map.Gbx",
      "a.Map.Gbx",
      "b.Map.Gbx",
    ]);
  });

  it("refuses a partial order, which would move maps to the end", async () => {
    const res = await orderRoute.PUT(
      req("/servers/server-a/maps/order", {
        method: "PUT",
        body: { uids: ["c", "a"] },
      }),
      onA(),
    );
    expect(res.status).toBe(400);
    expect(mocks.reorderMaps).not.toHaveBeenCalled();
  });
});

describe("v1 jukebox changes", () => {
  const entry = (uid: string, by: string) => ({
    ...row(uid),
    QueuedBy: by,
    QueuedByDisplayName: by,
    QueuedAt: "2026-10-21T12:00:00.000Z",
  });

  it("removes a queued map by UID", async () => {
    mocks.jukebox.mockResolvedValue([entry("a", "p1"), entry("b", "p2")]);
    let res = await jukeboxMapRoute.DELETE(
      req("/servers/server-a/jukebox/b", { method: "DELETE" }),
      onA({ uid: "b" }),
    );
    expect(res.status).toBe(204);
    expect(mocks.removeFromJukebox).toHaveBeenCalledWith(
      actor,
      "server-a",
      "id-b",
    );

    res = await jukeboxMapRoute.DELETE(
      req("/servers/server-a/jukebox/x", { method: "DELETE" }),
      onA({ uid: "x" }),
    );
    expect(res.status).toBe(404);
  });

  it("reorders entries and keeps who queued them", async () => {
    const entries = [entry("a", "p1"), entry("b", "p2"), entry("a", "p3")];
    mocks.jukebox.mockResolvedValue(entries);
    const res = await jukeboxOrderRoute.PUT(
      req("/servers/server-a/jukebox/order", {
        method: "PUT",
        body: { uids: ["b", "a", "a"] },
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.setJukebox).toHaveBeenCalledWith(actor, "server-a", [
      entries[1],
      entries[0],
      entries[2],
    ]);
  });
});
