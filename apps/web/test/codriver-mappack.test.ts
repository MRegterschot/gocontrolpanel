import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/lib/dbclient", () => ({ getClient: () => ({}) }));
vi.mock("@/lib/codriver/state", () => ({ getLiveState: vi.fn() }));
vi.mock("@/lib/codriver/events", () => ({ emitAction: vi.fn() }));
vi.mock("@/lib/api/tmx", () => ({
  searchTMXMappacks: mocks.search,
  getTMXTags: async () => [],
}));

import { codriverTools } from "@/lib/codriver/registry";
import { mappackNameAttempts } from "@/lib/codriver/tools/campaigns";

const tool = codriverTools.find((t) => t.name === "add_tmx_mappack")!;
const ctx = {} as never;

// Behaves like TMX: a name matches as a substring of a pack's name
const packs = [
  { MappackId: 3985, Name: "Beacon World League" },
  { MappackId: 4720, Name: "Beacon World League Season 2" },
  { MappackId: 7319, Name: "Beacon World League Season 3" },
  { MappackId: 11, Name: "Red Bull Faster 2026" },
];
beforeEach(() => {
  mocks.search.mockImplementation(async (params: { name?: string }) => ({
    Results: packs.filter((p) =>
      p.Name.toLowerCase().includes((params.name ?? "").toLowerCase()),
    ),
    More: false,
  }));
});

describe("mappackNameAttempts", () => {
  it("spells out seasons, then drops trailing words", () => {
    expect(mappackNameAttempts("World League S1")).toEqual([
      "World League S1",
      "World League season 1",
      "World League",
    ]);
  });

  it("keeps a short name as it is", () => {
    expect(mappackNameAttempts("Beacon")).toEqual(["Beacon"]);
  });
});

describe("add_tmx_mappack lookup before confirmation", () => {
  it("pins a name that matches exactly to its id", async () => {
    expect(await tool.prepare!(ctx, { name: "Red Bull Faster 2026" })).toEqual({
      name: "Red Bull Faster 2026",
      id: 11,
    });
  });

  it("asks which pack when the name only fits several, instead of saying nothing matches", async () => {
    await expect(
      tool.prepare!(ctx, { name: "World League S1" }),
    ).rejects.toThrow(/Which one: .*Beacon World League \(#3985\).*#4720/);
  });

  it("says when nothing on TMX fits", async () => {
    await expect(
      tool.prepare!(ctx, { name: "Zzz Nothing Here" }),
    ).rejects.toThrow(
      'No mappack matches "Zzz Nothing Here" on Trackmania Exchange.',
    );
  });

  it("leaves an id alone", async () => {
    const input = { id: 5 };
    expect(await tool.prepare!(ctx, input)).toBe(input);
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it("confirms the pack that was found, with its id", () => {
    expect(tool.summary!({ id: 3985, name: "Beacon World League" })).toBe(
      'Load the TMX mappack "Beacon World League" (#3985) now, replacing the current map list',
    );
  });
});
