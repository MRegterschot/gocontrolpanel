import { addMapFilesAs } from "@/actions/gbx/server-only/bulk-maps";
import {
  downloadFile,
  getClubActivities,
  getClubCampaign,
  getClubCampaigns,
  getClubs,
  getMapsInfo,
  getSeasonalCampaigns,
  getShortsCampaigns,
  getTotdRoyalMaps,
} from "@/lib/api/nadeo";
import {
  downloadTMXMap,
  searchTMXMappacks,
  searchTMXMaps,
} from "@/lib/api/tmx";
import { getLogger } from "@/lib/logger";
import type { MapInfo } from "@/types/api/nadeo";
import "server-only";
import { z } from "zod/v4";
import { chatSafe, fuzzyFind, normalize, stripFormatting } from "../text";
import { CodriverError, defineTool, type ToolContext } from "../types";
import { playOnly, serverMaps } from "./map-list";
import { queueFlag, queueMapFile, tmxTagParams } from "./maps";

const MAX_PACK_MAPS = 100;
async function mapInfos(uids: string[]): Promise<MapInfo[]> {
  if (uids.length === 0) throw new CodriverError("That has no maps.");
  const infos: MapInfo[] = [];
  for (let i = 0; i < uids.length; i += 200) {
    const { data, error } = await getMapsInfo(uids.slice(i, i + 200));
    if (error || !data)
      throw new CodriverError("Nadeo didn't return the maps.");
    infos.push(...data);
  }
  // Keep the campaign's own order
  return uids
    .map((uid) => infos.find((info) => info.mapUid === uid))
    .filter((info): info is MapInfo => !!info);
}

interface Downloaded {
  files: File[];
  // Map UIDs, in the same order as files
  uids: string[];
  // Names of maps that could not be downloaded
  failed: string[];
}

// Logs why a download failed; Error objects only serialize under the `err` key
function logDownloadFailure(
  ctx: ToolContext,
  map: { name: string; id: string | number },
  reason: unknown,
) {
  getLogger(ctx.serverId).warn(
    { err: reason, map: map.name, mapId: map.id },
    "Codriver map download failed",
  );
}

async function downloadNadeoMaps(
  ctx: ToolContext,
  infos: MapInfo[],
): Promise<Downloaded> {
  const results = await Promise.allSettled(
    infos.map((info) => downloadFile(info.fileUrl, info.filename)),
  );
  const downloaded: Downloaded = { files: [], uids: [], failed: [] };
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      downloaded.files.push(result.value);
      downloaded.uids.push(infos[index].mapUid);
    } else {
      logDownloadFailure(
        ctx,
        { name: infos[index].name, id: infos[index].mapUid },
        result.reason,
      );
      downloaded.failed.push(infos[index].name);
    }
  });
  return downloaded;
}

// Adds downloaded map files to the server, optionally queues them, and words the result
async function finish(
  ctx: ToolContext,
  downloaded: Downloaded,
  title: string,
  queue: boolean | undefined,
  auditAction: string,
  details: Record<string, string | number | boolean>,
) {
  const { files } = downloaded;
  if (files.length === 0)
    throw new CodriverError("None of the maps could be downloaded.");
  const { paths, failed: addFailed } = await addMapFilesAs(
    ctx.actor,
    ctx.serverId,
    files,
    title,
    auditAction,
    details,
  );
  if (paths.length === 0)
    throw new CodriverError("The server couldn't add those maps.");
  const present = downloaded.uids.filter(
    (_, index) => !addFailed.includes(files[index].name),
  );
  let queued = 0;
  let playing = 0;
  let restarted = false;
  if (!queue) {
    ({ count: playing, restarted } = await playOnly(ctx, present));
  } else {
    const listed = await serverMaps(ctx.serverId);
    for (const uid of present) {
      const map = listed.find((entry) => entry.UId === uid);
      if (!map) continue;
      try {
        await queueMapFile(ctx, map.FileName);
        queued++;
      } catch (error) {
        // The maps are on the server even if one can't be queued
        getLogger(ctx.serverId).warn(
          { err: error, map: map.FileName },
          "Codriver could not queue a map",
        );
      }
    }
  }
  const failed = [...downloaded.failed, ...addFailed];
  if (failed.length > 0) {
    getLogger(ctx.serverId).warn(
      { title, downloadFailed: downloaded.failed, addFailed },
      "Codriver could not add some maps",
    );
  }
  const noun = (count: number) => (count === 1 ? "map" : "maps");
  const outcome = queue
    ? `Added ${paths.length} ${noun(paths.length)} from ${chatSafe(title, 60)} and queued ${queued}.`
    : `Map list is now ${chatSafe(title, 60)} (${playing} ${noun(playing)}), ${restarted ? "restarting the current map" : "switching to it"}.`;
  return {
    reply:
      outcome +
      (failed.length > 0
        ? ` Failed: ${failed
            .slice(0, 3)
            .map((name) => chatSafe(name, 30))
            .join(
              ", ",
            )}${failed.length > 3 ? `, +${failed.length - 3} more` : ""}.`
        : ""),
  };
}

export const addWeeklyShorts = defineTool({
  name: "add_weekly_shorts",
  description:
    "Load the official Weekly Shorts of a week. weeks_ago 0 is this week. By default they replace the map list and play now; queue only on queue or add.",
  category: "maps",
  // Adding files to the server needs admin rights, as in the panel
  minRole: "admin",
  input: z.strictObject({
    weeks_ago: z.number().int().min(0).max(12).optional(),
    queue: queueFlag,
  }),
  async run(ctx, input) {
    const { campaignList } = await getShortsCampaigns(1, input.weeks_ago ?? 0);
    const campaign = campaignList[0];
    if (!campaign)
      throw new CodriverError("No Weekly Shorts found for that week.");
    const infos = await mapInfos(campaign.playlist.map((p) => p.mapUid));
    return finish(
      ctx,
      await downloadNadeoMaps(ctx, infos),
      campaign.name,
      input.queue,
      "server.nadeo.campaign.add",
      { campaign: campaign.name, campaignId: campaign.id },
    );
  },
});

export const addTrackOfTheDay = defineTool({
  name: "add_totd",
  description:
    "Load the Track of the Day. days_ago 0 is today's. royal picks the Royal TOTD. By default it replaces the map list and plays now; queue only on queue or add.",
  category: "maps",
  minRole: "admin",
  input: z.strictObject({
    days_ago: z.number().int().min(0).max(60).optional(),
    royal: z.boolean().optional(),
    queue: queueFlag,
  }),
  async run(ctx, input) {
    const { monthList } = await getTotdRoyalMaps(3, 0, input.royal ?? false);
    const now = Date.now() / 1000;
    const days = monthList
      .flatMap((month) => month.days)
      .filter((day) => day.mapUid && day.startTimestamp <= now)
      .sort((a, b) => b.startTimestamp - a.startTimestamp);
    const day = days[input.days_ago ?? 0];
    if (!day)
      throw new CodriverError("No Track of the Day found for that day.");
    const [info] = await mapInfos([day.mapUid]);
    if (!info) throw new CodriverError("Nadeo didn't return that map.");
    const label = `${input.royal ? "Royal " : ""}Track of the Day`;
    return finish(
      ctx,
      await downloadNadeoMaps(ctx, [info]),
      label,
      input.queue,
      "server.nadeo.map.add",
      { totd: day.mapUid, royal: input.royal ?? false },
    );
  },
});

export const addSeasonalCampaign = defineTool({
  name: "add_campaign",
  description:
    "Load an official seasonal campaign (people just say campaign), such as Summer 2025. Omit name for the newest. By default it replaces the map list and plays now; queue only on queue or add.",
  category: "maps",
  minRole: "admin",
  input: z.strictObject({
    name: z.string().min(1).max(40).optional(),
    queue: queueFlag,
  }),
  async run(ctx, input) {
    const { campaignList } = await getSeasonalCampaigns(100, 0);
    if (campaignList.length === 0)
      throw new CodriverError("No campaigns found.");
    let campaign = campaignList[0];
    if (input.name) {
      const found = fuzzyFind(input.name, campaignList, (c) => c.name);
      if (found.kind === "none")
        throw new CodriverError(
          `No campaign matches "${chatSafe(input.name, 40)}".`,
        );
      if (found.kind === "ambiguous")
        throw new CodriverError(
          `Which campaign: ${found.items.map((c) => c.name).join(", ")}?`,
        );
      campaign = found.item;
    }
    const infos = await mapInfos(campaign.playlist.map((p) => p.mapUid));
    return finish(
      ctx,
      await downloadNadeoMaps(ctx, infos),
      campaign.name,
      input.queue,
      "server.nadeo.campaign.add",
      { campaign: campaign.name, campaignId: campaign.id },
    );
  },
});

async function findClub(name: string) {
  const { clubList } = await getClubs(0, name, 10);
  const found = fuzzyFind(name, clubList, (club) => stripFormatting(club.name));
  if (found.kind === "none")
    throw new CodriverError(`No club matches "${chatSafe(name, 40)}".`);
  if (found.kind === "ambiguous")
    throw new CodriverError(
      `Which club: ${found.items.map((c) => chatSafe(c.name, 40)).join(", ")}?`,
    );
  return found.item;
}

export const findClubs = defineTool({
  name: "find_clubs",
  description: "Search Trackmania clubs by name.",
  category: "maps",
  minRole: "moderator",
  input: z.strictObject({ query: z.string().min(1).max(40) }),
  async run(_ctx, input) {
    const { clubList } = await getClubs(0, input.query, 5);
    if (clubList.length === 0)
      return { reply: `No club matches "${chatSafe(input.query, 40)}".` };
    return {
      reply: `Clubs: ${clubList
        .map((c) => chatSafe(`${c.name} [${stripFormatting(c.tag)}]`, 50))
        .join(", ")}.`,
    };
  },
});

export const listClubCampaigns = defineTool({
  name: "list_club_campaigns",
  description: "List the campaigns of a club, by club name.",
  category: "maps",
  minRole: "moderator",
  input: z.strictObject({ club: z.string().min(1).max(40) }),
  async run(_ctx, input) {
    const club = await findClub(input.club);
    const { activityList } = await getClubActivities(club.id, 0, 100);
    const campaigns = activityList.filter(
      (activity) => activity.activityType === "campaign",
    );
    if (campaigns.length === 0)
      return { reply: `${chatSafe(club.name, 40)} has no campaigns.` };
    return {
      reply: `${chatSafe(club.name, 40)} campaigns: ${campaigns
        .slice(0, 10)
        .map((c) => chatSafe(c.name, 40))
        .join(", ")}${campaigns.length > 10 ? ", …" : ""}.`,
    };
  },
});

export const addClubCampaign = defineTool({
  name: "add_club_campaign",
  description:
    "Load a club campaign. Give the club name too when the player did. By default it replaces the map list and plays now; queue only on queue or add.",
  category: "maps",
  minRole: "admin",
  input: z.strictObject({
    campaign: z.string().min(1).max(60),
    club: z.string().min(1).max(40).optional(),
    queue: queueFlag,
  }),
  async run(ctx, input) {
    let clubId: number;
    let campaignId: number;
    if (input.club) {
      const club = await findClub(input.club);
      const { activityList } = await getClubActivities(club.id, 0, 100);
      const found = fuzzyFind(
        input.campaign,
        activityList.filter((a) => a.activityType === "campaign"),
        (a) => stripFormatting(a.name),
      );
      if (found.kind === "none")
        throw new CodriverError(
          `${chatSafe(club.name, 40)} has no campaign "${chatSafe(input.campaign, 40)}".`,
        );
      if (found.kind === "ambiguous")
        throw new CodriverError(
          `Which campaign: ${found.items.map((a) => chatSafe(a.name, 40)).join(", ")}?`,
        );
      clubId = club.id;
      campaignId = found.item.campaignId;
    } else {
      const { clubCampaignList } = await getClubCampaigns(
        0,
        input.campaign,
        10,
      );
      const found = fuzzyFind(input.campaign, clubCampaignList, (c) =>
        stripFormatting(c.name),
      );
      if (found.kind === "none")
        throw new CodriverError(
          `No club campaign matches "${chatSafe(input.campaign, 40)}".`,
        );
      if (found.kind === "ambiguous")
        throw new CodriverError(
          `Which campaign: ${found.items
            .map((c) => chatSafe(`${c.name} (${c.clubName})`, 50))
            .join(", ")}?`,
        );
      // Several clubs can share a campaign name, and an exact match hides that
      const best = normalize(stripFormatting(found.item.name));
      const same = clubCampaignList.filter(
        (c) => normalize(stripFormatting(c.name)) === best,
      );
      if (new Set(same.map((c) => c.clubId)).size > 1)
        throw new CodriverError(
          `Which campaign: ${same
            .slice(0, 5)
            .map((c) => chatSafe(`${c.name} (${c.clubName})`, 50))
            .join(", ")}?`,
        );
      clubId = found.item.clubId;
      campaignId = found.item.campaignId;
    }

    const detail = await getClubCampaign(clubId, campaignId);
    const infos = await mapInfos(detail.campaign.playlist.map((p) => p.mapUid));
    return finish(
      ctx,
      await downloadNadeoMaps(ctx, infos),
      detail.name,
      input.queue,
      "server.nadeo.campaign.add",
      { clubId, campaignId, campaign: detail.name },
    );
  },
});

export const addTmxMappack = defineTool({
  name: "add_tmx_mappack",
  description:
    "Load a Trackmania Exchange (TMX) mappack, by name, id or style tags (the TMX tags in the state). Packs over 100 maps are refused. By default it replaces the map list and plays now; queue only on queue or add.",
  category: "maps",
  minRole: "admin",
  input: z.strictObject({
    name: z.string().min(1).max(60).optional(),
    id: z.number().int().min(1).optional(),
    tags: z.array(z.string().min(1).max(30)).max(3).optional(),
    queue: queueFlag,
  }),
  async run(ctx, input) {
    if (!input.name && !input.id && !input.tags?.length)
      throw new CodriverError("Tell me the mappack's name, id or a tag.");
    let packId = input.id;
    let packName = `Mappack ${input.id}`;
    if (!packId) {
      const { Results } = await searchTMXMappacks(
        {
          ...(input.name ? { name: input.name } : {}),
          ...(await tmxTagParams(input.tags)),
        },
        10,
      );
      if (Results.length === 0)
        throw new CodriverError("No mappack matches that.");
      // A name must match closely; a tag search just takes one of the hits
      const picked = input.name
        ? fuzzyFind(input.name, Results, (pack) => pack.Name)
        : ({
            kind: "match",
            item: Results[Math.floor(Math.random() * Results.length)],
          } as const);
      if (picked.kind === "none")
        throw new CodriverError(
          `No mappack matches "${chatSafe(input.name!, 40)}".`,
        );
      if (picked.kind === "ambiguous")
        throw new CodriverError(
          `Which mappack: ${picked.items.map((p) => `${chatSafe(p.Name, 40)} (#${p.MappackId})`).join(", ")}?`,
        );
      packId = picked.item.MappackId;
      packName = picked.item.Name;
    }

    const { Results, More } = await searchTMXMaps(
      { mappackid: String(packId) },
      MAX_PACK_MAPS,
    );
    if (Results.length === 0)
      throw new CodriverError("That mappack has no downloadable maps.");
    if (More)
      throw new CodriverError(
        `That mappack has more than ${MAX_PACK_MAPS} maps, add it in the panel instead.`,
      );
    const downloads = await Promise.allSettled(
      Results.map((map) => downloadTMXMap(map.MapId, packId)),
    );
    const downloaded: Downloaded = { files: [], uids: [], failed: [] };
    downloads.forEach((result, index) => {
      const map = Results[index];
      if (result.status === "fulfilled") {
        downloaded.files.push(result.value);
        downloaded.uids.push(map.MapUid);
      } else {
        const name = map.Name ?? `TMX ${map.MapId}`;
        logDownloadFailure(ctx, { name, id: map.MapId }, result.reason);
        downloaded.failed.push(name);
      }
    });
    return finish(
      ctx,
      downloaded,
      packName,
      input.queue,
      "server.tmx.mappack.add",
      { mappackId: packId, mappackName: packName },
    );
  },
});

export const campaignTools = [
  addWeeklyShorts,
  addTrackOfTheDay,
  addSeasonalCampaign,
  findClubs,
  listClubCampaigns,
  addClubCampaign,
  addTmxMappack,
];
