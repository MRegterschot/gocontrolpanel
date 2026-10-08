import { getClient } from "@/lib/dbclient";
import { getGbxClient } from "@/lib/gbx-service";
import { getKeyJukebox, getRedisClient } from "@/lib/redis";
import "server-only";
import { z } from "zod/v4";
import { modeKey, modeSettings, resolveSetting } from "../modes";
import { getLiveState } from "../state";
import { chatSafe } from "../text";
import { CodriverError, defineTool, hasRole } from "../types";

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(3).padStart(6, "0");
  return minutes > 0 ? `${minutes}:${seconds}` : seconds;
}

export const getServerState = defineTool({
  name: "get_server_state",
  description: "Current mode, map, players and queue length.",
  category: "info",
  minRole: "guest",
  input: z.strictObject({}),
  async run(ctx) {
    const state = await getLiveState(ctx.serverId);
    const redis = await getRedisClient();
    const queued = await redis.llen(getKeyJukebox(ctx.serverId));
    const spectators = state.players.filter((p) => p.spectator).length;
    const map = state.map ? `${chatSafe(state.map.name, 60)}` : "no map";
    return {
      reply:
        `${modeKey(state.script)} on ${map}, ${state.players.length} players` +
        (spectators ? ` (${spectators} spectating)` : "") +
        `, ${queued} maps queued.`,
    };
  },
});

export const getModeSettings = defineTool({
  name: "get_mode_settings",
  description:
    "Show the current mode's settings that differ from the defaults.",
  category: "info",
  minRole: "guest",
  input: z.strictObject({}),
  async run(ctx) {
    const state = await getLiveState(ctx.serverId);
    const known = modeSettings(state.script);
    if (!known)
      return { reply: `${modeKey(state.script)} has no known settings.` };

    const current = await getGbxClient(ctx.serverId).call<
      Record<string, string | number | boolean>
    >("GetModeScriptSettings");
    const changed = known.filter((setting) => {
      const value = current[setting.name];
      return (
        value !== undefined &&
        String(value).toLowerCase() !== setting.default.toLowerCase()
      );
    });
    if (changed.length === 0) {
      return { reply: `${modeKey(state.script)} runs with default settings.` };
    }
    return {
      reply: `${modeKey(state.script)}: ${changed
        .slice(0, 10)
        .map(
          (setting) =>
            `${setting.name} ${chatSafe(String(current[setting.name]), 30)}`,
        )
        .join(", ")}.`,
    };
  },
});

export const explainSetting = defineTool({
  name: "explain_setting",
  description: "Explain one setting of the current mode.",
  category: "info",
  minRole: "guest",
  input: z.strictObject({ name: z.string().min(1).max(60) }),
  async run(ctx, input) {
    const state = await getLiveState(ctx.serverId);
    const setting = resolveSetting(state.script, input.name);
    return {
      reply: `${setting.name} (${setting.type}, default ${setting.default}): ${setting.description}.`,
    };
  },
});

export const getMapRecords = defineTool({
  name: "get_map_records",
  description: "Best times on the current map recorded on this server.",
  category: "info",
  minRole: "guest",
  input: z.strictObject({}),
  async run(ctx) {
    const state = await getLiveState(ctx.serverId);
    if (!state.map) throw new CodriverError("No map is loaded.");

    const db = getClient();
    const best = await db.records.groupBy({
      by: ["login"],
      where: {
        serverId: ctx.serverId,
        mapUid: state.map.uid,
        deletedAt: null,
        time: { gt: 0 },
        login: { not: null },
      },
      _min: { time: true },
      orderBy: { _min: { time: "asc" } },
      take: 5,
    });
    if (best.length === 0) return { reply: "No records on this map yet." };

    const users = await db.users.findMany({
      where: { login: { in: best.map((entry) => entry.login!) } },
      select: { login: true, nickName: true },
    });
    const names = new Map(users.map((user) => [user.login, user.nickName]));
    return {
      reply: best
        .map(
          (entry, i) =>
            `${i + 1}. ${chatSafe(names.get(entry.login!) ?? entry.login!, 30)} ${formatTime(entry._min.time!)}`,
        )
        .join(", "),
    };
  },
});

const examples: { role: "guest" | "moderator" | "admin"; text: string }[] = [
  { role: "guest", text: "/co status, /co who has the record?" },
  {
    role: "moderator",
    text: "/co skip, /co points limit 100, /co kick Bob, /co list plugins",
  },
  {
    role: "admin",
    text: "/co cup mode with 100 points, /co enable live round, /co ban Bob",
  },
];

export const codriverHelp = defineTool({
  name: "codriver_help",
  description: "What the caller can ask Codriver.",
  category: "info",
  minRole: "guest",
  input: z.strictObject({}),
  async run(ctx) {
    const lines = examples
      .filter((e) => hasRole(ctx.role, e.role))
      .map((e) => e.text);
    return { reply: `Try: ${lines.join(", ")}.` };
  },
});

export const infoTools = [
  getServerState,
  getModeSettings,
  explainSetting,
  getMapRecords,
  codriverHelp,
];
