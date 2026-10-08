import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getShortsCampaigns: vi.fn(),
  getMapsInfo: vi.fn(),
  downloadFile: vi.fn(),
  getTotdRoyalMaps: vi.fn(),
  getSeasonalCampaigns: vi.fn(),
  getClubs: vi.fn(),
  getClubActivities: vi.fn(),
  getClubCampaign: vi.fn(),
  getClubCampaigns: vi.fn(),
  searchTMXMappacks: vi.fn(),
  searchTMXMaps: vi.fn(),
  downloadTMXMap: vi.fn(),
  addMapFilesAs: vi.fn(),
  queueMapFile: vi.fn(),
  serverMaps: vi.fn(),
  removeMapsAs: vi.fn(),
  clearJukeboxAs: vi.fn(),
  jumpToMapIndexAs: vi.fn(),
  restartMapAs: vi.fn(),
  tagParams: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  getLogger: () => ({ warn: mocks.warn, info: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/lib/api/nadeo", () => ({
  downloadFile: mocks.downloadFile,
  getClubActivities: mocks.getClubActivities,
  getClubCampaign: mocks.getClubCampaign,
  getClubCampaigns: mocks.getClubCampaigns,
  getClubs: mocks.getClubs,
  getMapsInfo: mocks.getMapsInfo,
  getSeasonalCampaigns: mocks.getSeasonalCampaigns,
  getShortsCampaigns: mocks.getShortsCampaigns,
  getTotdRoyalMaps: mocks.getTotdRoyalMaps,
}));
vi.mock("@/lib/api/tmx", () => ({
  downloadTMXMap: mocks.downloadTMXMap,
  searchTMXMaps: mocks.searchTMXMaps,
  searchTMXMappacks: mocks.searchTMXMappacks,
}));
vi.mock("@/actions/gbx/server-only/bulk-maps", () => ({
  addMapFilesAs: mocks.addMapFilesAs,
}));
vi.mock("@/lib/codriver/tools/maps", () => ({
  queueMapFile: mocks.queueMapFile,
  queueFlag: { optional: () => undefined },
  tmxTagParams: mocks.tagParams,
}));
vi.mock("@/lib/gbx-service", () => ({
  getGbxClient: () => ({ call: async () => mocks.serverMaps() }),
}));
vi.mock("@/actions/gbx/server-only/game", () => ({
  restartMapAs: mocks.restartMapAs,
}));
vi.mock("@/actions/gbx/server-only/map", () => ({
  removeMapsAs: mocks.removeMapsAs,
  clearJukeboxAs: mocks.clearJukeboxAs,
  jumpToMapIndexAs: mocks.jumpToMapIndexAs,
}));

import {
  addClubCampaign,
  addSeasonalCampaign,
  addTmxMappack,
  addTrackOfTheDay,
  addWeeklyShorts,
} from "@/lib/codriver/tools/campaigns";

const ctx = { serverId: "s", actor: {}, role: "admin" } as never;
const info = (uid: string) => ({
  mapUid: uid,
  name: `Map ${uid}`,
  filename: `${uid}.Map.Gbx`,
  fileUrl: `https://x/${uid}`,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getMapsInfo.mockImplementation(async (uids: string[]) => ({
    data: uids.map(info),
  }));
  mocks.downloadFile.mockImplementation(
    async (_url: string, name: string) => new File(["x"], name),
  );
  // The server reports paths with backslashes and still lists the old maps
  let listed = [{ FileName: "Old\\keep-me-not.Map.Gbx", UId: "old" }];
  mocks.jumpToMapIndexAs.mockResolvedValue(undefined);
  mocks.tagParams.mockResolvedValue({});
  mocks.serverMaps.mockImplementation(async () => listed);
  mocks.addMapFilesAs.mockImplementation(
    async (_a: unknown, _s: string, files: File[], folder: string) => {
      const paths = files.map((f) => `Downloaded/${folder}/${f.name}`);
      // A map the server already holds, whatever its path, is not added twice
      const fresh = paths
        .map((path) => ({
          FileName: path.replaceAll("/", "\\"),
          UId: path
            .split("/")
            .pop()!
            .replace(/\.Map\.Gbx$/, ""),
        }))
        .filter((map) => !listed.some((entry) => entry.UId === map.UId));
      listed = [...listed, ...fresh];
      return { paths, failed: [] };
    },
  );
  mocks.removeMapsAs.mockImplementation(async (_a, _s, names: string[]) => {
    listed = listed.filter((map) => !names.includes(map.FileName));
  });
});

describe("addWeeklyShorts", () => {
  const campaign = {
    id: 1,
    name: "Week 12",
    playlist: [{ mapUid: "a" }, { mapUid: "b" }],
  };

  it("adds every map of the week and queues them on request", async () => {
    mocks.getShortsCampaigns.mockResolvedValue({ campaignList: [campaign] });
    const result = await addWeeklyShorts.run(ctx, { queue: true });
    expect(mocks.getShortsCampaigns).toHaveBeenCalledWith(1, 0);
    expect(mocks.addMapFilesAs.mock.calls[0][2]).toHaveLength(2);
    expect(mocks.queueMapFile).toHaveBeenCalledTimes(2);
    expect(result.reply).toBe("Added 2 maps from Week 12 and queued 2.");
    expect(mocks.removeMapsAs).not.toHaveBeenCalled();
    expect(mocks.jumpToMapIndexAs).not.toHaveBeenCalled();
  });

  it("replaces the map list and switches to the first map by default", async () => {
    mocks.getShortsCampaigns.mockResolvedValue({ campaignList: [campaign] });
    const result = await addWeeklyShorts.run(ctx, {});
    expect(mocks.queueMapFile).not.toHaveBeenCalled();
    expect(mocks.removeMapsAs).toHaveBeenCalledWith(
      (ctx as { actor: unknown }).actor,
      "s",
      ["Old\\keep-me-not.Map.Gbx"],
    );
    expect(mocks.clearJukeboxAs).toHaveBeenCalled();
    expect(mocks.jumpToMapIndexAs).toHaveBeenCalledWith(
      (ctx as { actor: unknown }).actor,
      "s",
      0,
    );
    expect(result.reply).toBe(
      "Map list is now Week 12 (2 maps), switching to it.",
    );
  });

  it("says when a week has nothing", async () => {
    mocks.getShortsCampaigns.mockResolvedValue({ campaignList: [] });
    await expect(addWeeklyShorts.run(ctx, { weeks_ago: 5 })).rejects.toThrow(
      "No Weekly Shorts",
    );
  });

  it("restarts instead of failing when the new map is already playing", async () => {
    mocks.getShortsCampaigns.mockResolvedValue({ campaignList: [campaign] });
    mocks.jumpToMapIndexAs.mockRejectedValue(
      new Error("The next map must be different from the current one."),
    );
    const result = await addWeeklyShorts.run(ctx, {});
    expect(mocks.restartMapAs).toHaveBeenCalledOnce();
    expect(result.reply).toBe(
      "Map list is now Week 12 (2 maps), restarting the current map.",
    );
  });

  it("finds maps the server already holds under another file name", async () => {
    mocks.getShortsCampaigns.mockResolvedValue({ campaignList: [campaign] });
    mocks.serverMaps.mockResolvedValueOnce([
      { FileName: "Campaigns\\a-elsewhere.Map.Gbx", UId: "a" },
      { FileName: "Old\\keep-me-not.Map.Gbx", UId: "old" },
    ]);
    await addWeeklyShorts.run(ctx, {});
    expect(mocks.removeMapsAs).toHaveBeenCalledWith(
      (ctx as { actor: unknown }).actor,
      "s",
      ["Old\\keep-me-not.Map.Gbx"],
    );
  });

  it("names the maps that failed and logs why", async () => {
    mocks.getShortsCampaigns.mockResolvedValue({ campaignList: [campaign] });
    const reason = new Error("404");
    mocks.downloadFile.mockRejectedValueOnce(reason);
    const result = await addWeeklyShorts.run(ctx, {});
    expect(result.reply).toBe(
      "Map list is now Week 12 (1 map), switching to it. Failed: Map a.",
    );
    expect(mocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: reason, map: "Map a", mapId: "a" }),
      "Codriver map download failed",
    );
  });
});

describe("addTrackOfTheDay", () => {
  it("picks the newest day that already started", async () => {
    const now = Date.now() / 1000;
    mocks.getTotdRoyalMaps.mockResolvedValue({
      monthList: [
        {
          days: [
            { mapUid: "future", startTimestamp: now + 86400 },
            { mapUid: "today", startTimestamp: now - 100 },
            { mapUid: "yesterday", startTimestamp: now - 86500 },
          ],
        },
      ],
    });
    await addTrackOfTheDay.run(ctx, {});
    expect(mocks.getMapsInfo).toHaveBeenCalledWith(["today"]);
    await addTrackOfTheDay.run(ctx, { days_ago: 1 });
    expect(mocks.getMapsInfo).toHaveBeenLastCalledWith(["yesterday"]);
  });
});

describe("addSeasonalCampaign", () => {
  const list = {
    campaignList: [
      { id: 2, name: "Summer 2026", playlist: [{ mapUid: "n" }] },
      { id: 1, name: "Winter 2026", playlist: [{ mapUid: "w" }] },
    ],
  };

  it("takes the newest campaign without a name", async () => {
    mocks.getSeasonalCampaigns.mockResolvedValue(list);
    await addSeasonalCampaign.run(ctx, {});
    expect(mocks.getMapsInfo).toHaveBeenCalledWith(["n"]);
  });

  it("matches a name and refuses an unknown one", async () => {
    mocks.getSeasonalCampaigns.mockResolvedValue(list);
    await addSeasonalCampaign.run(ctx, { name: "winter 2026" });
    expect(mocks.getMapsInfo).toHaveBeenLastCalledWith(["w"]);
    await expect(
      addSeasonalCampaign.run(ctx, { name: "autumn 1999" }),
    ).rejects.toThrow("No campaign matches");
  });
});

describe("addClubCampaign", () => {
  it("asks which one when several clubs have the same campaign", async () => {
    mocks.getClubCampaigns.mockResolvedValue({
      clubCampaignList: [
        { name: "Sprint", clubName: "A", clubId: 1, campaignId: 1 },
        { name: "Sprint", clubName: "B", clubId: 2, campaignId: 2 },
      ],
    });
    await expect(
      addClubCampaign.run(ctx, { campaign: "Sprint" }),
    ).rejects.toThrow("Which campaign");
  });

  it("adds the maps of the matched campaign", async () => {
    mocks.getClubCampaigns.mockResolvedValue({
      clubCampaignList: [
        { name: "Sprint", clubName: "A", clubId: 1, campaignId: 9 },
      ],
    });
    mocks.getClubCampaign.mockResolvedValue({
      name: "Sprint",
      campaign: { playlist: [{ mapUid: "m1" }] },
    });
    const result = await addClubCampaign.run(ctx, { campaign: "Sprint" });
    expect(mocks.getClubCampaign).toHaveBeenCalledWith(1, 9);
    expect(result.reply).toBe(
      "Map list is now Sprint (1 map), switching to it.",
    );
  });
});

describe("addTmxMappack", () => {
  it("refuses packs over the size limit", async () => {
    mocks.searchTMXMaps.mockResolvedValue({
      More: true,
      Results: [{ MapId: 1 }],
    });
    await expect(addTmxMappack.run(ctx, { id: 5 })).rejects.toThrow(
      "more than 100",
    );
    expect(mocks.downloadTMXMap).not.toHaveBeenCalled();
  });

  it("finds a pack by name and downloads its maps from that pack", async () => {
    mocks.searchTMXMappacks.mockResolvedValue({
      Results: [{ MappackId: 7, Name: "Fullspeed Fun" }],
    });
    mocks.searchTMXMaps.mockResolvedValue({
      More: false,
      Results: [
        { MapId: 11, MapUid: "TMX_11" },
        { MapId: 12, MapUid: "TMX_12" },
      ],
    });
    mocks.downloadTMXMap.mockImplementation(
      async (id: number) => new File(["x"], `TMX_${id}.Map.Gbx`),
    );
    const result = await addTmxMappack.run(ctx, { name: "fullspeed fun" });
    expect(mocks.downloadTMXMap).toHaveBeenCalledWith(11, 7);
    expect(result.reply).toBe(
      "Map list is now Fullspeed Fun (2 maps), switching to it.",
    );
  });

  it("searches by tags when no name is given and takes one of the hits", async () => {
    mocks.tagParams.mockResolvedValue({ tag: "3,2", taginclusive: "true" });
    mocks.searchTMXMappacks.mockResolvedValue({
      Results: [{ MappackId: 9, Name: "Tech Fun" }],
    });
    mocks.searchTMXMaps.mockResolvedValue({
      More: false,
      Results: [{ MapId: 1, MapUid: "TMX_1" }],
    });
    mocks.downloadTMXMap.mockImplementation(
      async (id: number) => new File(["x"], `TMX_${id}.Map.Gbx`),
    );
    const result = await addTmxMappack.run(ctx, {
      tags: ["tech", "fullspeed"],
    });
    expect(mocks.searchTMXMappacks).toHaveBeenCalledWith(
      { tag: "3,2", taginclusive: "true" },
      10,
    );
    expect(result.reply).toContain("Tech Fun");
  });

  it("needs a name or an id", async () => {
    await expect(addTmxMappack.run(ctx, {})).rejects.toThrow(
      "name, id or a tag",
    );
  });
});
