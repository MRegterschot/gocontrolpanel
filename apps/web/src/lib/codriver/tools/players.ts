import {
  addGuestAs,
  banPlayerAs,
  blacklistPlayerAs,
  forceSpectatorAs,
  kickPlayerAs,
  removeGuestAs,
  setPlayerMapPointsAs,
  setPlayerMatchPointsAs,
  setPlayerRoundPointsAs,
  setTeamMapPointsAs,
  setTeamMatchPointsAs,
  setTeamRoundPointsAs,
  unbanPlayerAs,
  unblacklistPlayerAs,
} from "@/actions/gbx/server-only/player";
import { actorForLogin } from "@/lib/actor";
import { getClient } from "@/lib/dbclient";
import { getGbxClient } from "@/lib/gbx-service";
import "server-only";
import { z } from "zod/v4";
import { resolveRole } from "../roles";
import { getLiveState } from "../state";
import { chatSafe, fuzzyFind } from "../text";
import {
  CodriverError,
  defineTool,
  roleRank,
  type ToolContext,
} from "../types";

interface Target {
  login: string;
  name: string;
}

function pick(query: string, candidates: Target[], where: string): Target {
  if (query.startsWith("login:")) {
    const target = candidates.find(
      (candidate) => candidate.login === query.slice(6),
    );
    if (target) return target;
    throw new CodriverError(
      "The confirmed player is no longer available. Ask again.",
    );
  }
  const exact = candidates.find((candidate) => candidate.login === query);
  if (exact) return exact;
  const found = fuzzyFind(query, candidates, (c) => `${c.name} ${c.login}`);
  if (found.kind === "match") return found.item;
  if (found.kind === "ambiguous") {
    throw new CodriverError(
      `Which player: ${found.items.map((c) => chatSafe(c.name, 30)).join(", ")}?`,
    );
  }
  throw new CodriverError(
    `No player ${where} matches "${chatSafe(query, 30)}".`,
  );
}

async function onlinePlayer(ctx: ToolContext, query: string): Promise<Target> {
  const { players } = await getLiveState(ctx.serverId);
  return pick(
    query,
    players.map((p) => ({ login: p.login, name: p.nickName })),
    "online",
  );
}

// Players on a server list (bans, blacklist, guests) are often offline; names come from the panel
async function listedPlayer(
  ctx: ToolContext,
  query: string,
  method: "GetBanList" | "GetBlackList" | "GetGuestList",
  where: string,
): Promise<Target> {
  const entries = await getGbxClient(ctx.serverId).call<{ Login: string }[]>(
    method,
    1000,
    0,
  );
  const logins = (Array.isArray(entries) ? entries : []).map(
    (entry) => entry.Login,
  );
  const users = await getClient().users.findMany({
    where: { login: { in: logins } },
    select: { login: true, nickName: true },
  });
  const names = new Map(users.map((user) => [user.login, user.nickName]));
  return pick(
    query,
    logins.map((login) => ({ login, name: names.get(login) ?? login })),
    where,
  );
}

// Codriver never acts on someone who outranks the caller on this server
async function assertNotOutranked(
  ctx: ToolContext,
  target: Target,
): Promise<void> {
  const actor = await actorForLogin(target.login);
  const targetIsPanelAdmin = actor.claims.admin;
  if (
    (targetIsPanelAdmin && !ctx.actor.claims.admin) ||
    roleRank[resolveRole(actor, ctx.serverId)] > roleRank[ctx.role]
  ) {
    throw new CodriverError(
      `You can't do that to ${chatSafe(target.name, 30)}.`,
    );
  }
}

const player = z.string().min(1).max(60);
const reason = z.string().max(100).optional();

export const kickPlayer = defineTool({
  name: "kick_player",
  description: "Kick an online player from the server.",
  category: "players",
  minRole: "moderator",
  input: z.strictObject({ player, reason }),
  async prepare(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    await assertNotOutranked(ctx, target);
    return { ...input, player: `login:${target.login}` };
  },
  async confirm(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    return `Kick ${chatSafe(target.name, 30)}?`;
  },
  async run(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    await assertNotOutranked(ctx, target);
    await kickPlayerAs(
      ctx.actor,
      ctx.serverId,
      target.login,
      input.reason ?? "",
    );
    return { reply: `Kicked ${chatSafe(target.name, 30)}.` };
  },
});

const spectatorModes = { spectator: 1, player: 2, free: 0 } as const;

export const forceSpectator = defineTool({
  name: "force_spectator",
  description:
    "Force an online player to spectate or to play, or let them choose again (free).",
  category: "players",
  minRole: "moderator",
  input: z.strictObject({
    player,
    mode: z.enum(["spectator", "player", "free"]),
  }),
  async prepare(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    await assertNotOutranked(ctx, target);
    return { ...input, player: `login:${target.login}` };
  },
  async run(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    await assertNotOutranked(ctx, target);
    await forceSpectatorAs(
      ctx.actor,
      ctx.serverId,
      target.login,
      spectatorModes[input.mode],
    );
    const name = chatSafe(target.name, 30);
    return {
      reply:
        input.mode === "spectator"
          ? `${name} is now spectating.`
          : input.mode === "player"
            ? `${name} is now playing.`
            : `${name} can choose again.`,
    };
  },
});

export const banPlayer = defineTool({
  name: "ban_player",
  description: "Ban an online player from the server.",
  category: "players",
  minRole: "admin",
  input: z.strictObject({ player, reason }),
  async prepare(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    await assertNotOutranked(ctx, target);
    return { ...input, player: `login:${target.login}` };
  },
  async confirm(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    return `Ban ${chatSafe(target.name, 30)}?`;
  },
  async run(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    await assertNotOutranked(ctx, target);
    await banPlayerAs(
      ctx.actor,
      ctx.serverId,
      target.login,
      input.reason ?? "",
    );
    return { reply: `Banned ${chatSafe(target.name, 30)}.` };
  },
});

export const unbanPlayer = defineTool({
  name: "unban_player",
  description: "Remove a player from the ban list.",
  category: "players",
  minRole: "admin",
  input: z.strictObject({ player }),
  async prepare(ctx, input) {
    const target = await listedPlayer(
      ctx,
      input.player,
      "GetBanList",
      "on the list",
    );
    await assertNotOutranked(ctx, target);
    return { ...input, player: `login:${target.login}` };
  },
  async confirm(ctx, input) {
    const target = await listedPlayer(
      ctx,
      input.player,
      "GetBanList",
      "on the ban list",
    );
    return `Unban ${chatSafe(target.name, 30)}?`;
  },
  async run(ctx, input) {
    const target = await listedPlayer(
      ctx,
      input.player,
      "GetBanList",
      "on the ban list",
    );
    await assertNotOutranked(ctx, target);
    await unbanPlayerAs(ctx.actor, ctx.serverId, target.login);
    return { reply: `Unbanned ${chatSafe(target.name, 30)}.` };
  },
});

export const blacklistPlayer = defineTool({
  name: "blacklist_player",
  description: "Blacklist an online player so they can't join again.",
  category: "players",
  minRole: "admin",
  input: z.strictObject({ player }),
  async prepare(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    await assertNotOutranked(ctx, target);
    return { ...input, player: `login:${target.login}` };
  },
  async confirm(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    return `Blacklist ${chatSafe(target.name, 30)}?`;
  },
  async run(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    await assertNotOutranked(ctx, target);
    await blacklistPlayerAs(ctx.actor, ctx.serverId, target.login);
    return { reply: `Blacklisted ${chatSafe(target.name, 30)}.` };
  },
});

export const unblacklistPlayer = defineTool({
  name: "unblacklist_player",
  description: "Remove a player from the blacklist.",
  category: "players",
  minRole: "admin",
  input: z.strictObject({ player }),
  async prepare(ctx, input) {
    const target = await listedPlayer(
      ctx,
      input.player,
      "GetBlackList",
      "on the list",
    );
    await assertNotOutranked(ctx, target);
    return { ...input, player: `login:${target.login}` };
  },
  async confirm(ctx, input) {
    const target = await listedPlayer(
      ctx,
      input.player,
      "GetBlackList",
      "on the blacklist",
    );
    return `Remove ${chatSafe(target.name, 30)} from the blacklist?`;
  },
  async run(ctx, input) {
    const target = await listedPlayer(
      ctx,
      input.player,
      "GetBlackList",
      "on the blacklist",
    );
    await assertNotOutranked(ctx, target);
    await unblacklistPlayerAs(ctx.actor, ctx.serverId, target.login);
    return {
      reply: `Removed ${chatSafe(target.name, 30)} from the blacklist.`,
    };
  },
});

export const addGuest = defineTool({
  name: "add_guest",
  description:
    "Add an online player to the guest list, so they can join when the server is full.",
  category: "players",
  minRole: "admin",
  input: z.strictObject({ player }),
  async prepare(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    await assertNotOutranked(ctx, target);
    return { ...input, player: `login:${target.login}` };
  },
  async confirm(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    return `Add ${chatSafe(target.name, 30)} to the guest list?`;
  },
  async run(ctx, input) {
    const target = await onlinePlayer(ctx, input.player);
    await assertNotOutranked(ctx, target);
    await addGuestAs(ctx.actor, ctx.serverId, target.login);
    return { reply: `Added ${chatSafe(target.name, 30)} to the guest list.` };
  },
});

export const removeGuest = defineTool({
  name: "remove_guest",
  description: "Remove a player from the guest list.",
  category: "players",
  minRole: "admin",
  input: z.strictObject({ player }),
  async prepare(ctx, input) {
    const target = await listedPlayer(
      ctx,
      input.player,
      "GetGuestList",
      "on the list",
    );
    await assertNotOutranked(ctx, target);
    return { ...input, player: `login:${target.login}` };
  },
  async confirm(ctx, input) {
    const target = await listedPlayer(
      ctx,
      input.player,
      "GetGuestList",
      "on the guest list",
    );
    return `Remove ${chatSafe(target.name, 30)} from the guest list?`;
  },
  async run(ctx, input) {
    const target = await listedPlayer(
      ctx,
      input.player,
      "GetGuestList",
      "on the guest list",
    );
    await assertNotOutranked(ctx, target);
    await removeGuestAs(ctx.actor, ctx.serverId, target.login);
    return {
      reply: `Removed ${chatSafe(target.name, 30)} from the guest list.`,
    };
  },
});

const teams = { blue: 0, red: 1 } as const;
const playerPoints = {
  round: setPlayerRoundPointsAs,
  map: setPlayerMapPointsAs,
  match: setPlayerMatchPointsAs,
};
const teamPoints = {
  round: setTeamRoundPointsAs,
  map: setTeamMapPointsAs,
  match: setTeamMatchPointsAs,
};

const pointsInput = z.strictObject({
  // An online player's name, or "blue" / "red" for a team
  who: z.string().min(1).max(60),
  target: z.enum(["player", "team"]),
  scope: z.enum(["round", "map", "match"]),
  points: z.number().int().min(-10_000).max(100_000),
});

function teamOf(who: string): 0 | 1 {
  const team = teams[who.trim().toLowerCase() as keyof typeof teams];
  if (team === undefined)
    throw new CodriverError('Name the team "blue" or "red".');
  return team;
}

export const setPoints = defineTool({
  name: "set_points",
  description:
    "Set the round, map or match points of an online player or of the blue or red team.",
  category: "players",
  minRole: "admin",
  input: pointsInput,
  async prepare(ctx, input) {
    if (input.target === "team") {
      teamOf(input.who);
      return { ...input, who: input.who.trim().toLowerCase() };
    }
    const target = await onlinePlayer(ctx, input.who);
    await assertNotOutranked(ctx, target);
    return { ...input, who: `login:${target.login}` };
  },
  async confirm(ctx, input) {
    const name =
      input.target === "team"
        ? `team ${input.who.toLowerCase()}`
        : chatSafe((await onlinePlayer(ctx, input.who)).name, 30);
    return `Set the ${input.scope} points of ${name} to ${input.points}?`;
  },
  async run(ctx, input) {
    if (input.target === "team") {
      await teamPoints[input.scope](
        ctx.actor,
        ctx.serverId,
        teamOf(input.who),
        input.points,
      );
      return {
        reply: `Team ${input.who.toLowerCase()} now has ${input.points} ${input.scope} points.`,
      };
    }
    const target = await onlinePlayer(ctx, input.who);
    await assertNotOutranked(ctx, target);
    await playerPoints[input.scope](
      ctx.actor,
      ctx.serverId,
      target.login,
      input.points,
    );
    return {
      reply: `${chatSafe(target.name, 30)} now has ${input.points} ${input.scope} points.`,
    };
  },
});

export const playerTools = [
  kickPlayer,
  forceSpectator,
  banPlayer,
  unbanPlayer,
  blacklistPlayer,
  unblacklistPlayer,
  addGuest,
  removeGuest,
  setPoints,
];
