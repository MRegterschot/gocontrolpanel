import { z } from "zod/v4";
import { defineEndpoint } from "./endpoint";
import {
  dataOf,
  JukeboxEntrySchema,
  ListedPlayerSchema,
  listFileBody,
  MapSchema,
  MatchDetailSchema,
  MatchSchema,
  pageOf,
  paginationQuery,
  playerLogin,
  PlayerSchema,
  resourceId,
  serverParams,
  ServerSchema,
} from "./schemas";

export const listServers = defineEndpoint({
  id: "listServers",
  method: "get",
  path: "/servers",
  scope: null,
  tag: "Servers",
  summary: "List the servers this key can reach",
  description:
    "The key's server, or every server currently in the key's group.",
  status: 200,
  response: dataOf(z.array(ServerSchema)),
});

export const getServer = defineEndpoint({
  id: "getServer",
  method: "get",
  path: "/servers/{serverId}",
  scope: "server:read",
  tag: "Servers",
  summary: "Get a server",
  params: serverParams,
  status: 200,
  response: dataOf(ServerSchema),
});

export const listPlayers = defineEndpoint({
  id: "listPlayers",
  method: "get",
  path: "/servers/{serverId}/players",
  scope: "players:read",
  tag: "Players",
  summary: "List connected players",
  params: serverParams,
  status: 200,
  response: dataOf(z.array(PlayerSchema)),
});

export const kickPlayer = defineEndpoint({
  id: "kickPlayer",
  method: "post",
  path: "/servers/{serverId}/players/{login}/kick",
  scope: "players:write",
  tag: "Players",
  summary: "Kick a player",
  params: serverParams.extend({ login: playerLogin }),
  body: z.object({
    reason: z.string().max(200).default(""),
  }),
  status: 204,
});

export const banPlayer = defineEndpoint({
  id: "banPlayer",
  method: "post",
  path: "/servers/{serverId}/players/{login}/ban",
  scope: "players:write",
  tag: "Players",
  summary: "Ban a connected player",
  description:
    "Bans last until the server restarts; use the blacklist for a lasting ban.",
  params: serverParams.extend({ login: playerLogin }),
  body: z.object({
    reason: z.string().max(200).default(""),
  }),
  status: 204,
});

export const forceSpectator = defineEndpoint({
  id: "forceSpectator",
  method: "post",
  path: "/servers/{serverId}/players/{login}/spectator",
  scope: "players:write",
  tag: "Players",
  summary: "Force a player into spectator or player mode",
  params: serverParams.extend({ login: playerLogin }),
  body: z.object({
    mode: z
      .enum(["selectable", "spectator", "player", "spectatorSelectable"])
      .meta({
        description:
          "selectable: the player chooses; spectatorSelectable: spectator, but may switch back",
      }),
  }),
  status: 204,
});

export const listBans = defineEndpoint({
  id: "listBans",
  method: "get",
  path: "/servers/{serverId}/bans",
  scope: "players:read",
  tag: "Bans",
  summary: "List banned players",
  params: serverParams,
  status: 200,
  response: dataOf(z.array(ListedPlayerSchema)),
});

export const unbanPlayer = defineEndpoint({
  id: "unbanPlayer",
  method: "delete",
  path: "/servers/{serverId}/bans/{login}",
  scope: "players:write",
  tag: "Bans",
  summary: "Unban a player",
  params: serverParams.extend({ login: playerLogin }),
  status: 204,
});

export const clearBans = defineEndpoint({
  id: "clearBans",
  method: "delete",
  path: "/servers/{serverId}/bans",
  scope: "players:write",
  tag: "Bans",
  summary: "Unban everyone",
  params: serverParams,
  status: 204,
});

export const listBlacklist = defineEndpoint({
  id: "listBlacklist",
  method: "get",
  path: "/servers/{serverId}/blacklist",
  scope: "players:read",
  tag: "Blacklist",
  summary: "List the blacklist",
  description: "Blacklisted players can never join.",
  params: serverParams,
  status: 200,
  response: dataOf(z.array(ListedPlayerSchema)),
});

export const addToBlacklist = defineEndpoint({
  id: "addToBlacklist",
  method: "put",
  path: "/servers/{serverId}/blacklist/{login}",
  scope: "players:write",
  tag: "Blacklist",
  summary: "Add a player to the blacklist",
  description: "Save the blacklist to keep it after a server restart.",
  params: serverParams.extend({ login: playerLogin }),
  status: 204,
});

export const removeFromBlacklist = defineEndpoint({
  id: "removeFromBlacklist",
  method: "delete",
  path: "/servers/{serverId}/blacklist/{login}",
  scope: "players:write",
  tag: "Blacklist",
  summary: "Remove a player from the blacklist",
  params: serverParams.extend({ login: playerLogin }),
  status: 204,
});

export const clearBlacklist = defineEndpoint({
  id: "clearBlacklist",
  method: "delete",
  path: "/servers/{serverId}/blacklist",
  scope: "players:write",
  tag: "Blacklist",
  summary: "Empty the blacklist",
  params: serverParams,
  status: 204,
});

export const loadBlacklist = defineEndpoint({
  id: "loadBlacklist",
  method: "post",
  path: "/servers/{serverId}/blacklist/load",
  scope: "players:write",
  tag: "Blacklist",
  summary: "Load the blacklist from a file",
  params: serverParams,
  body: listFileBody,
  status: 204,
});

export const saveBlacklist = defineEndpoint({
  id: "saveBlacklist",
  method: "post",
  path: "/servers/{serverId}/blacklist/save",
  scope: "players:write",
  tag: "Blacklist",
  summary: "Save the blacklist to a file",
  params: serverParams,
  body: listFileBody,
  status: 204,
});

export const listGuestlist = defineEndpoint({
  id: "listGuestlist",
  method: "get",
  path: "/servers/{serverId}/guestlist",
  scope: "players:read",
  tag: "Guestlist",
  summary: "List the guestlist",
  description: "The dedicated server's guest list.",
  params: serverParams,
  status: 200,
  response: dataOf(z.array(ListedPlayerSchema)),
});

export const addToGuestlist = defineEndpoint({
  id: "addToGuestlist",
  method: "put",
  path: "/servers/{serverId}/guestlist/{login}",
  scope: "players:write",
  tag: "Guestlist",
  summary: "Add a player to the guestlist",
  description: "Save the guestlist to keep it after a server restart.",
  params: serverParams.extend({ login: playerLogin }),
  status: 204,
});

export const removeFromGuestlist = defineEndpoint({
  id: "removeFromGuestlist",
  method: "delete",
  path: "/servers/{serverId}/guestlist/{login}",
  scope: "players:write",
  tag: "Guestlist",
  summary: "Remove a player from the guestlist",
  params: serverParams.extend({ login: playerLogin }),
  status: 204,
});

export const clearGuestlist = defineEndpoint({
  id: "clearGuestlist",
  method: "delete",
  path: "/servers/{serverId}/guestlist",
  scope: "players:write",
  tag: "Guestlist",
  summary: "Empty the guestlist",
  params: serverParams,
  status: 204,
});

export const loadGuestlist = defineEndpoint({
  id: "loadGuestlist",
  method: "post",
  path: "/servers/{serverId}/guestlist/load",
  scope: "players:write",
  tag: "Guestlist",
  summary: "Load the guestlist from a file",
  params: serverParams,
  body: listFileBody,
  status: 204,
});

export const saveGuestlist = defineEndpoint({
  id: "saveGuestlist",
  method: "post",
  path: "/servers/{serverId}/guestlist/save",
  scope: "players:write",
  tag: "Guestlist",
  summary: "Save the guestlist to a file",
  params: serverParams,
  body: listFileBody,
  status: 204,
});

export const listMaps = defineEndpoint({
  id: "listMaps",
  method: "get",
  path: "/servers/{serverId}/maps",
  scope: "maps:read",
  tag: "Maps",
  summary: "List the server's map list",
  params: serverParams,
  query: z.object({
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .meta({ description: "Omit for the whole map list" }),
  }),
  status: 200,
  response: dataOf(z.array(MapSchema)),
});

export const addTmxMap = defineEndpoint({
  id: "addTmxMap",
  method: "post",
  path: "/servers/{serverId}/maps/tmx",
  scope: "maps:write",
  tag: "Maps",
  summary: "Download a map from Trackmania Exchange and add it to the map list",
  description: "Needs the server's file manager.",
  params: serverParams,
  body: z.object({
    mapId: z
      .int()
      .positive()
      .meta({ description: "Trackmania Exchange map ID" }),
  }),
  status: 201,
  response: dataOf(
    z.object({
      path: z
        .string()
        .meta({ description: "Path in the server's maps folder" }),
    }),
  ),
});

export const getJukebox = defineEndpoint({
  id: "getJukebox",
  method: "get",
  path: "/servers/{serverId}/jukebox",
  scope: "jukebox:read",
  tag: "Jukebox",
  summary: "List queued maps",
  params: serverParams,
  status: 200,
  response: dataOf(z.array(JukeboxEntrySchema)),
});

export const addToJukebox = defineEndpoint({
  id: "addToJukebox",
  method: "post",
  path: "/servers/{serverId}/jukebox",
  scope: "jukebox:write",
  tag: "Jukebox",
  summary: "Queue a map",
  description:
    "The map must be known to the panel, for example from the map list.",
  params: serverParams,
  body: z.object({
    uid: z.string().min(1).max(64).meta({ description: "Map UID" }),
  }),
  status: 201,
  response: dataOf(JukeboxEntrySchema),
});

export const clearJukebox = defineEndpoint({
  id: "clearJukebox",
  method: "delete",
  path: "/servers/{serverId}/jukebox",
  scope: "jukebox:write",
  tag: "Jukebox",
  summary: "Clear the jukebox",
  params: serverParams,
  status: 204,
});

export const listMatches = defineEndpoint({
  id: "listMatches",
  method: "get",
  path: "/servers/{serverId}/matches",
  scope: "matches:read",
  tag: "Matches",
  summary: "List recorded matches, newest first",
  params: serverParams,
  query: paginationQuery,
  status: 200,
  response: pageOf(MatchSchema),
});

export const getMatch = defineEndpoint({
  id: "getMatch",
  method: "get",
  path: "/servers/{serverId}/matches/{matchId}",
  scope: "matches:read",
  tag: "Matches",
  summary: "Get a recorded match with its records",
  params: serverParams.extend({ matchId: resourceId }),
  status: 200,
  response: dataOf(MatchDetailSchema),
});

export const publicApiEndpoints = [
  listServers,
  getServer,
  listPlayers,
  kickPlayer,
  banPlayer,
  forceSpectator,
  listBans,
  unbanPlayer,
  clearBans,
  listBlacklist,
  addToBlacklist,
  removeFromBlacklist,
  clearBlacklist,
  loadBlacklist,
  saveBlacklist,
  listGuestlist,
  addToGuestlist,
  removeFromGuestlist,
  clearGuestlist,
  loadGuestlist,
  saveGuestlist,
  listMaps,
  addTmxMap,
  getJukebox,
  addToJukebox,
  clearJukebox,
  listMatches,
  getMatch,
] as const;
