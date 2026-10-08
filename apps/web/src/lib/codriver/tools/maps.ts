import { findOrCreateMapByFileName } from "@/actions/database/server-only/maps";
import { nextMapAs, restartMapAs } from "@/actions/gbx/server-only/game";
import {
  addMapToJukeboxAs,
  clearJukeboxAs,
} from "@/actions/gbx/server-only/map";
import { addTmxMapToServerAs } from "@/actions/tmx/server-only/maps";
import { getTMXTags, searchTMXMaps } from "@/lib/api/tmx";
import { getErrorMessage } from "@/lib/utils";
import "server-only";
import { z } from "zod/v4";
import { getLiveState } from "../state";
import { chatSafe, fuzzyFind, stripFormatting } from "../text";
import { CodriverError, defineTool, type ToolContext } from "../types";
import {
  jumpOrRestart,
  playOnly,
  type ServerMap,
  serverMaps,
} from "./map-list";

function findServerMap(
  maps: ServerMap[],
  query: string,
): { map: ServerMap; index: number } {
  const found = fuzzyFind(query, maps, (map) => stripFormatting(map.Name));
  if (found.kind === "match")
    return { map: found.item, index: maps.indexOf(found.item) };
  if (found.kind === "ambiguous") {
    throw new CodriverError(
      `Which map: ${found.items.map((map) => chatSafe(map.Name, 40)).join(", ")}?`,
    );
  }
  throw new CodriverError(
    `No map on this server matches "${chatSafe(query, 40)}".`,
  );
}

export async function queueMapFile(
  ctx: ToolContext,
  fileName: string,
): Promise<string> {
  const row = await findOrCreateMapByFileName(ctx.serverId, fileName);
  if (!row) throw new CodriverError("The server could not read that map file.");
  const queued = await addMapToJukeboxAs(ctx.actor, ctx.serverId, row);
  return chatSafe(queued.name, 60);
}

// More than the caller on the server: skipping or restarting affects others
async function othersRacing(serverId: string): Promise<boolean> {
  const state = await getLiveState(serverId);
  return state.players.filter((player) => !player.spectator).length > 1;
}

const difficulties = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
  "Lunatic",
  "Impossible",
] as const;

// Shared by every tool that loads maps: queue only when the player says queue or add
export const queueFlag = z
  .boolean()
  .optional()
  .describe(
    "true only when the player says queue or add. Otherwise leave it out: the maps then replace the whole map list and play right away.",
  );

// TMX style tags as search parameters: several tags must all match (taginclusive)
export async function tmxTagParams(
  tags: string[] | undefined,
): Promise<Record<string, string>> {
  if (!tags?.length) return {};
  const known = await getTMXTags();
  const ids = tags.map((tag) => {
    const found = fuzzyFind(tag, known, (t) => t.Name);
    if (found.kind === "none")
      throw new CodriverError(`TMX has no tag "${chatSafe(tag, 30)}".`);
    if (found.kind === "ambiguous")
      throw new CodriverError(
        `Which tag: ${found.items.map((t) => t.Name).join(", ")}?`,
      );
    return found.item.ID;
  });
  const unique = [...new Set(ids)];
  return {
    tag: unique.join(","),
    ...(unique.length > 1 ? { taginclusive: "true" } : {}),
  };
}

export const addTmxMap = defineTool({
  name: "add_tmx_map",
  description:
    "Find a map on Trackmania Exchange (TMX), add it to the server and play it. Use for maps not on the server. Put the kind of map in tags (the TMX tags in the state, for example Tech, FullSpeed, RPG, Dirt, SnowCar) and only use name for a map's title. By default it replaces the map list and plays now; queue only on queue or add.",
  category: "maps",
  // Adding files to the server needs admin rights, as in the panel
  minRole: "admin",
  input: z.strictObject({
    vehicle: z
      .enum(["CarSport", "CarSnow", "CarRally", "CarDesert"])
      .optional(),
    tags: z.array(z.string().min(1).max(30)).max(3).optional(),
    difficulty: z.enum(difficulties).optional(),
    max_author_time_seconds: z.number().int().min(5).max(600).optional(),
    name: z.string().min(1).max(60).optional(),
    author: z.string().min(1).max(40).optional(),
    pick: z.enum(["random", "newest"]).optional(),
    queue: queueFlag,
  }),
  async run(ctx, input) {
    const params: Record<string, string> = {};
    if (input.vehicle) params.vehicle = input.vehicle;
    if (input.difficulty)
      params.difficulty = String(difficulties.indexOf(input.difficulty));
    if (input.max_author_time_seconds) {
      params.authortimemax = String(input.max_author_time_seconds * 1000);
    }
    if (input.name) params.name = input.name;
    if (input.author) params.author = input.author;
    Object.assign(params, await tmxTagParams(input.tags));
    if ((input.pick ?? "random") === "random") params.random = "1";

    const { Results } = await searchTMXMaps(params, 1);
    const map = Results[0];
    if (!map) throw new CodriverError("No TMX map matches that.");

    const onServer = (await serverMaps(ctx.serverId)).find(
      (m) => m.UId === map.MapUid,
    );
    const fileName =
      onServer?.FileName ??
      (await addTmxMapToServerAs(ctx.actor, ctx.serverId, map.MapId));
    const author = map.Authors[0]?.User.Name;
    const by = author ? ` by ${chatSafe(author, 30)}` : "";
    if (input.queue) {
      const name = await queueMapFile(ctx, fileName);
      return { reply: `Queued ${name}${by} from TMX.` };
    }
    const { restarted } = await playOnly(ctx, [map.MapUid]);
    const name = chatSafe(map.GbxMapName ?? map.Name ?? "the map", 60);
    return {
      reply: restarted
        ? `${name}${by} is already playing, restarting it.`
        : `Switching to ${name}${by} from TMX.`,
    };
  },
});

export const queueServerMap = defineTool({
  name: "queue_server_map",
  description: "Queue a map that is already on the server, by name.",
  category: "maps",
  minRole: "moderator",
  input: z.strictObject({ query: z.string().min(1).max(60) }),
  async run(ctx, input) {
    const { map } = findServerMap(await serverMaps(ctx.serverId), input.query);
    return { reply: `Queued ${await queueMapFile(ctx, map.FileName)}.` };
  },
});

export const jumpToMap = defineTool({
  name: "jump_to_map",
  description:
    "Switch to a map on the server right now, ending the current one.",
  category: "maps",
  minRole: "moderator",
  input: z.strictObject({ query: z.string().min(1).max(60) }),
  async run(ctx, input) {
    const maps = await serverMaps(ctx.serverId);
    const { map, index } = findServerMap(maps, input.query);
    const result = await jumpOrRestart(ctx, index);
    return {
      reply:
        result === "restarted"
          ? `${chatSafe(map.Name, 60)} is already playing, restarting it.`
          : `Switching to ${chatSafe(map.Name, 60)}.`,
    };
  },
});

export const skipMap = defineTool({
  name: "skip_map",
  description: "Skip to the next map.",
  category: "maps",
  minRole: "moderator",
  input: z.strictObject({}),
  async confirm(ctx) {
    return (await othersRacing(ctx.serverId))
      ? "Skip this map for everyone?"
      : null;
  },
  async run(ctx) {
    try {
      await nextMapAs(ctx.actor, ctx.serverId);
    } catch (error) {
      if (!/must be different/i.test(getErrorMessage(error))) throw error;
      // It is the only map on the server, so skipping means starting it again
      await restartMapAs(ctx.actor, ctx.serverId);
      return { reply: "It's the only map, restarting it." };
    }
    return { reply: "Skipping to the next map." };
  },
});

export const restartMap = defineTool({
  name: "restart_map",
  description: "Restart the current map.",
  category: "maps",
  minRole: "moderator",
  input: z.strictObject({}),
  async confirm(ctx) {
    return (await othersRacing(ctx.serverId))
      ? "Restart this map for everyone?"
      : null;
  },
  async run(ctx) {
    await restartMapAs(ctx.actor, ctx.serverId);
    return { reply: "Restarting the map." };
  },
});

export const clearJukebox = defineTool({
  name: "clear_jukebox",
  description: "Remove all queued maps.",
  category: "maps",
  minRole: "moderator",
  input: z.strictObject({}),
  async run(ctx) {
    await clearJukeboxAs(ctx.actor, ctx.serverId);
    return { reply: "Cleared the map queue." };
  },
});

export const mapTools = [
  addTmxMap,
  queueServerMap,
  jumpToMap,
  skipMap,
  restartMap,
  clearJukebox,
];
