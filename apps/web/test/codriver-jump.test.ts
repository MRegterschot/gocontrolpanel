import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  jump: vi.fn(),
  restart: vi.fn(),
  next: vi.fn(),
  maps: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/actions/database/server-only/maps", () => ({
  findOrCreateMapByFileName: vi.fn(),
}));
vi.mock("@/actions/gbx/server-only/game", () => ({
  nextMapAs: mocks.next,
  restartMapAs: mocks.restart,
}));
vi.mock("@/actions/gbx/server-only/map", () => ({
  addMapToJukeboxAs: vi.fn(),
  clearJukeboxAs: vi.fn(),
  jumpToMapIndexAs: mocks.jump,
}));
vi.mock("@/actions/tmx/server-only/maps", () => ({
  addTmxMapToServerAs: vi.fn(),
}));
vi.mock("@/lib/api/tmx", () => ({
  getTMXTags: vi.fn(),
  searchTMXMaps: vi.fn(),
}));
vi.mock("@/lib/gbx-service", () => ({
  getGbxClient: () => ({ call: mocks.maps }),
}));
vi.mock("@/lib/codriver/state", () => ({ getLiveState: vi.fn() }));

import { jumpOrRestart } from "@/lib/codriver/tools/map-list";
import { jumpToMap, skipMap } from "@/lib/codriver/tools/maps";

const ctx = { serverId: "s", actor: {}, role: "moderator" } as never;
const sameMap = new Error(
  "The next map must be different from the current one.",
);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.maps.mockResolvedValue([
    { UId: "u", Name: "Winter 01", FileName: "Winter 01.Map.Gbx", Author: "a" },
  ]);
});

describe("jumpOrRestart", () => {
  it("jumps normally", async () => {
    expect(await jumpOrRestart(ctx, 2)).toBe("jumped");
    expect(mocks.restart).not.toHaveBeenCalled();
  });

  it("restarts when the target is the map already playing", async () => {
    mocks.jump.mockRejectedValue(sameMap);
    expect(await jumpOrRestart(ctx, 0)).toBe("restarted");
    expect(mocks.restart).toHaveBeenCalledOnce();
  });

  it("passes other errors on", async () => {
    mocks.jump.mockRejectedValue(new Error("Server busy."));
    await expect(jumpOrRestart(ctx, 0)).rejects.toThrow("Server busy.");
    expect(mocks.restart).not.toHaveBeenCalled();
  });
});

describe("map tools", () => {
  it("jump_to_map says it restarted the current map", async () => {
    mocks.jump.mockRejectedValue(sameMap);
    const result = await jumpToMap.run(ctx, { query: "winter 01" });
    expect(result.reply).toBe("Winter 01 is already playing, restarting it.");
  });

  it("skip_map restarts when it is the only map", async () => {
    mocks.next.mockRejectedValue(sameMap);
    const result = await skipMap.run(ctx, {});
    expect(mocks.restart).toHaveBeenCalledOnce();
    expect(result.reply).toBe("It's the only map, restarting it.");
  });
});
