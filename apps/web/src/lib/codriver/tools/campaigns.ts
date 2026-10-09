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
import type { Club, MapInfo } from "@/types/api/nadeo";
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
    "Load the Track of the Day. days_ago 0 is today's; date (YYYY-MM-DD) picks a specific day instead. royal picks the Royal TOTD. By default it replaces the map list and plays now; queue only on queue or add.",
  category: "maps",
  minRole: "admin",
  input: z.strictObject({
    days_ago: z.number().int().min(0).max(60).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    royal: z.boolean().optional(),
    queue: queueFlag,
  }),
  async run(ctx, input) {
    if (input.date && input.days_ago !== undefined)
      throw new CodriverError("Give either a date or days ago, not both.");
    const now = Date.now() / 1000;
    let day;
    if (input.date) {
      const [year, month, monthDay] = input.date.split("-").map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, monthDay));
      if (
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== monthDay
      )
        throw new CodriverError(`${input.date} isn't a real date.`);
      const current = new Date();
      // Month offset 0 is the current month
      const offset =
        (current.getUTCFullYear() - year) * 12 +
        current.getUTCMonth() +
        1 -
        month;
      if (offset < 0) throw new CodriverError("That date is in the future.");
      const { monthList } = await getTotdRoyalMaps(
        1,
        offset,
        input.royal ?? false,
      );
      day = monthList
        .find((m) => m.year === year && m.month === month)
        ?.days.find(
          (d) => d.mapUid && d.monthDay === monthDay && d.startTimestamp <= now,
        );
    } else {
      const { monthList } = await getTotdRoyalMaps(3, 0, input.royal ?? false);
      const days = monthList
        .flatMap((month) => month.days)
        .filter((d) => d.mapUid && d.startTimestamp <= now)
        .sort((a, b) => b.startTimestamp - a.startTimestamp);
      day = days[input.days_ago ?? 0];
    }
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
    "Load an official seasonal campaign (people just say campaign), such as Summer 2025. Omit name for the newest. A name that is no seasonal campaign is searched in the club campaigns. By default it replaces the map list and plays now; queue only on queue or add.",
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
      // Players say campaign for club campaigns too, without naming a club
      if (found.kind === "none")
        return addClubCampaign.run(ctx, {
          campaign: input.name,
          queue: input.queue,
        });
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

// With optional, an unknown club gives null instead of an error
async function findClub(name: string, optional: true): Promise<null | Club>;
async function findClub(name: string, optional?: false): Promise<Club>;
async function findClub(name: string, optional = false) {
  const { clubList } = await getClubs(0, name, 10);
  const found = fuzzyFind(name, clubList, (club) => stripFormatting(club.name));
  if (found.kind === "none") {
    if (optional) return null;
    throw new CodriverError(`No club matches "${chatSafe(name, 40)}".`);
  }
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

interface ClubCampaignMatch {
  clubId: number;
  campaignId: number;
  // False when the name only resembles what was asked for
  exact: boolean;
}

// id:<club>:<campaign>, optionally followed by what the player asked for
const confirmedCampaign = /^id:(\d+):(\d+)(?::(.*))?$/;

async function resolveClubCampaign(input: {
  campaign: string;
  club?: string;
}): Promise<ClubCampaignMatch> {
  const confirmed = confirmedCampaign.exec(input.campaign);
  if (confirmed)
    return {
      clubId: Number(confirmed[1]),
      campaignId: Number(confirmed[2]),
      exact: true,
    };
  // The model sometimes puts part of the campaign name in club; if no club has that
  // name, search all club campaigns with both words
  const club = input.club ? await findClub(input.club, true) : null;
  const query =
    club || !input.club ? input.campaign : `${input.club} ${input.campaign}`;
  const isExact = (name: string) =>
    normalize(query) === normalize(stripFormatting(name));

  if (club) {
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
    return {
      clubId: club.id,
      campaignId: found.item.campaignId,
      exact: isExact(found.item.name),
    };
  }

  let { clubCampaignList } = await getClubCampaigns(0, query, 10);
  if (clubCampaignList.length === 0 && query !== input.campaign)
    ({ clubCampaignList } = await getClubCampaigns(0, input.club!, 10));
  const found = fuzzyFind(query, clubCampaignList, (c) =>
    stripFormatting(c.name),
  );
  if (found.kind === "none")
    throw new CodriverError(
      `No club campaign matches "${chatSafe(query, 40)}".`,
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
  return {
    clubId: found.item.clubId,
    campaignId: found.item.campaignId,
    exact: isExact(found.item.name),
  };
}

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
  // A near match is pinned by id so the confirmed campaign is the one that runs
  async prepare(_ctx, input) {
    const match = await resolveClubCampaign(input);
    if (match.exact) return input;
    return {
      ...input,
      campaign: `id:${match.clubId}:${match.campaignId}:${input.campaign.slice(0, 30)}`,
      club: undefined,
    };
  },
  async confirm(_ctx, input) {
    const pinned = confirmedCampaign.exec(input.campaign);
    if (!pinned) return null;
    const detail = await getClubCampaign(Number(pinned[1]), Number(pinned[2]));
    const asked = pinned[3] ? ` for "${chatSafe(pinned[3], 30)}"` : "";
    return `No exact match${asked}, the closest is ${chatSafe(detail.name, 60)}. Load it?`;
  },
  async run(ctx, input) {
    const { clubId, campaignId } = await resolveClubCampaign(input);

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
