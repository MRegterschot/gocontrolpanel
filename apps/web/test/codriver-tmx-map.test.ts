import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  search: vi.fn(),
  addTmx: vi.fn(),
  jump: vi.fn(),
  restart: vi.fn(),
  remove: vi.fn(),
  clearJukebox: vi.fn(),
  jukebox: vi.fn(),
  findMap: vi.fn(),
  tags: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/actions/database/server-only/maps", () => ({
  findOrCreateMapByFileName: mocks.findMap,
}));
vi.mock("@/actions/gbx/server-only/game", () => ({
  nextMapAs: vi.fn(),
  restartMapAs: mocks.restart,
}));
vi.mock("@/actions/gbx/server-only/map", () => ({
  addMapToJukeboxAs: mocks.jukebox,
  clearJukeboxAs: mocks.clearJukebox,
  jumpToMapIndexAs: mocks.jump,
  removeMapsAs: mocks.remove,
}));
vi.mock("@/actions/tmx/server-only/maps", () => ({
  addTmxMapToServerAs: mocks.addTmx,
}));
vi.mock("@/lib/api/tmx", () => ({
  getTMXTags: mocks.tags,
  searchTMXMaps: mocks.search,
}));
vi.mock("@/lib/gbx-service", () => ({
  getGbxClient: () => ({ call: async () => mocks.list() }),
}));
vi.mock("@/lib/codriver/state", () => ({ getLiveState: vi.fn() }));

import { addTmxMap } from "@/lib/codriver/tools/maps";

const ctx = { serverId: "s", actor: { login: "l" }, role: "admin" } as never;
const result = {
  MapId: 5,
  MapUid: "desert-uid",
  Name: "Desert Dash",
  GbxMapName: "Desert Dash",
  Authors: [{ User: { Name: "bob" } }],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.search.mockResolvedValue({ Results: [result] });
  mocks.tags.mockResolvedValue([
    { ID: 3, Name: "Tech" },
    { ID: 2, Name: "FullSpeed" },
    { ID: 4, Name: "RPG" },
    { ID: 50, Name: "SnowCar" },
    { ID: 51, Name: "SpeedTech" },
  ]);
  mocks.addTmx.mockResolvedValue("Downloaded/TMX_5.Map.Gbx");
  mocks.findMap.mockResolvedValue({ name: "Desert Dash" });
  mocks.jukebox.mockResolvedValue({ name: "Desert Dash" });
  // The new map is in the list once it was added
  mocks.list.mockResolvedValue([
    { UId: "old", Name: "Old", FileName: "Old.Map.Gbx", Author: "a" },
    {
      UId: "desert-uid",
      Name: "Desert Dash",
      FileName: "Downloaded\\TMX_5.Map.Gbx",
      Author: "bob",
    },
  ]);
});

describe("add_tmx_map tags", () => {
  it("searches by one tag id", async () => {
    await addTmxMap.run(ctx, { tags: ["rpg"] });
    expect(mocks.search.mock.calls[0][0]).toMatchObject({ tag: "4" });
    expect(mocks.search.mock.calls[0][0]).not.toHaveProperty("taginclusive");
  });

  it("requires every tag when there are several", async () => {
    await addTmxMap.run(ctx, { tags: ["tech", "fullspeed"] });
    expect(mocks.search.mock.calls[0][0]).toMatchObject({
      tag: "3,2",
      taginclusive: "true",
    });
  });

  it("refuses a tag TMX does not have", async () => {
    await expect(addTmxMap.run(ctx, { tags: ["banana"] })).rejects.toThrow(
      'TMX has no tag "banana"',
    );
    expect(mocks.search).not.toHaveBeenCalled();
  });
});

describe("add_tmx_map", () => {
  it("makes the map the only one and switches to it by default", async () => {
    const out = await addTmxMap.run(ctx, { vehicle: "CarDesert" });
    expect(mocks.remove).toHaveBeenCalledWith(expect.anything(), "s", [
      "Old.Map.Gbx",
    ]);
    expect(mocks.clearJukebox).toHaveBeenCalled();
    expect(mocks.jump).toHaveBeenCalled();
    expect(mocks.jukebox).not.toHaveBeenCalled();
    expect(out.reply).toBe("Switching to Desert Dash by bob from TMX.");
  });

  it("only queues the map when asked to", async () => {
    const out = await addTmxMap.run(ctx, { queue: true });
    expect(mocks.jukebox).toHaveBeenCalledOnce();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.jump).not.toHaveBeenCalled();
    expect(out.reply).toBe("Queued Desert Dash by bob from TMX.");
  });

  it("restarts when the map is already playing", async () => {
    mocks.jump.mockRejectedValue(
      new Error("The next map must be different from the current one."),
    );
    const out = await addTmxMap.run(ctx, {});
    expect(mocks.restart).toHaveBeenCalledOnce();
    expect(out.reply).toBe(
      "Desert Dash by bob is already playing, restarting it.",
    );
  });
});
