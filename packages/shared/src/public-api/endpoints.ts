import { z } from "zod/v4";
import { defineEndpoint } from "./endpoint";
import {
  CurrentMapsSchema,
  dataOf,
  FileEntrySchema,
  GameSchema,
  InstalledPluginSchema,
  JukeboxEntrySchema,
  ListedPlayerSchema,
  listFileBody,
  mapFileName,
  MapSchema,
  mapUid,
  MatchDetailSchema,
  MatchSchema,
  pageOf,
  paginationQuery,
  playerLogin,
  PlayerSchema,
  pointsType,
  resourceId,
  ScriptInfoSchema,
  ScriptSettingsSchema,
  scriptSettingValue,
  serverParams,
  ServerSchema,
  ServerScriptPluginSchema,
  ServerSettingsChangesSchema,
  ServerSettingsSchema,
  uidOrderBody,
  userDataPath,
} from "./schemas";

const matchSettingsBody = z.object({
  filename: listFileBody.shape.filename.meta({
    description: "Relative to the server's Maps folder",
    example: "MatchSettings/tracklist.txt",
  }),
});

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

export const getCurrentMaps = defineEndpoint({
  id: "getCurrentMaps",
  method: "get",
  path: "/servers/{serverId}/maps/current",
  scope: "maps:read",
  tag: "Maps",
  summary: "Get the map being played and the next one",
  params: serverParams,
  status: 200,
  response: dataOf(CurrentMapsSchema),
});

export const listMapFiles = defineEndpoint({
  id: "listMapFiles",
  method: "get",
  path: "/servers/{serverId}/maps/files",
  scope: "maps:read",
  tag: "Maps",
  summary: "List the map files in the server's Maps folder",
  description:
    "Includes maps that are not on the map list. Needs the server's file manager.",
  params: serverParams,
  status: 200,
  response: dataOf(z.array(MapSchema)),
});

export const addMaps = defineEndpoint({
  id: "addMaps",
  method: "post",
  path: "/servers/{serverId}/maps",
  scope: "maps:write",
  tag: "Maps",
  summary: "Add map files to the map list",
  description:
    "Files come from the server's Maps folder, see listMapFiles. Maps already on the list are skipped.",
  params: serverParams,
  body: z.object({
    fileNames: z.array(mapFileName).min(1).max(100),
  }),
  status: 200,
  response: dataOf(
    z.object({
      added: z.int().meta({ description: "Maps the server accepted" }),
    }),
  ),
});

export const removeMaps = defineEndpoint({
  id: "removeMaps",
  method: "post",
  path: "/servers/{serverId}/maps/remove",
  scope: "maps:write",
  tag: "Maps",
  summary: "Remove maps from the map list",
  description:
    "The files stay in the Maps folder. The last map cannot be removed.",
  params: serverParams,
  body: z.object({
    uids: z.array(mapUid).min(1).max(1000),
  }),
  status: 204,
});

export const reorderMaps = defineEndpoint({
  id: "reorderMaps",
  method: "put",
  path: "/servers/{serverId}/maps/order",
  scope: "maps:write",
  tag: "Maps",
  summary: "Reorder the map list",
  description: "List every map on the map list once, in the new order.",
  params: serverParams,
  body: uidOrderBody,
  status: 204,
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

export const removeFromJukebox = defineEndpoint({
  id: "removeFromJukebox",
  method: "delete",
  path: "/servers/{serverId}/jukebox/{uid}",
  scope: "jukebox:write",
  tag: "Jukebox",
  summary: "Remove a map from the jukebox",
  description: "Removes every queued entry of the map.",
  params: serverParams.extend({ uid: mapUid }),
  status: 204,
});

export const reorderJukebox = defineEndpoint({
  id: "reorderJukebox",
  method: "put",
  path: "/servers/{serverId}/jukebox/order",
  scope: "jukebox:write",
  tag: "Jukebox",
  summary: "Reorder the jukebox",
  description:
    "List the UID of every queued entry once, in the new order; a map queued twice is listed twice.",
  params: serverParams,
  body: uidOrderBody,
  status: 204,
});

export const getGame = defineEndpoint({
  id: "getGame",
  method: "get",
  path: "/servers/{serverId}/game",
  scope: "game:read",
  tag: "Game",
  summary: "Get the game mode script and opponent visibility",
  params: serverParams,
  status: 200,
  response: dataOf(GameSchema),
});

export const getScriptInfo = defineEndpoint({
  id: "getScriptInfo",
  method: "get",
  path: "/servers/{serverId}/game/script",
  scope: "game:read",
  tag: "Game",
  summary: "Describe the running game mode script and its settings",
  params: serverParams,
  status: 200,
  response: dataOf(ScriptInfoSchema),
});

export const setScript = defineEndpoint({
  id: "setScript",
  method: "put",
  path: "/servers/{serverId}/game/script",
  scope: "game:write",
  tag: "Game",
  summary: "Change the game mode script",
  description: "Takes effect on the next map; restart the map to apply it now.",
  params: serverParams,
  body: z.object({
    script: z
      .string()
      .max(255)
      .regex(/^(?!\/)(?!.*(^|\/)\.{1,2}(\/|$))[\w .\/-]+\.Script\.txt$/i)
      .meta({ example: "Trackmania/TM_TimeAttack_Online.Script.txt" }),
  }),
  status: 204,
});

export const getScriptSettings = defineEndpoint({
  id: "getScriptSettings",
  method: "get",
  path: "/servers/{serverId}/game/script-settings",
  scope: "game:read",
  tag: "Game",
  summary: "Get the game mode script's settings",
  params: serverParams,
  status: 200,
  response: dataOf(ScriptSettingsSchema),
});

export const updateScriptSettings = defineEndpoint({
  id: "updateScriptSettings",
  method: "patch",
  path: "/servers/{serverId}/game/script-settings",
  scope: "game:write",
  tag: "Game",
  summary: "Change some of the game mode script's settings",
  description: "Settings left out keep their value.",
  params: serverParams,
  body: z.object({
    settings: z
      .record(z.string().regex(/^S_\w{1,100}$/), scriptSettingValue)
      .refine((settings) => Object.keys(settings).length > 0, {
        message: "Change at least one setting",
      })
      .meta({ example: { S_TimeLimit: 300 } }),
  }),
  status: 204,
});

export const restartMap = defineEndpoint({
  id: "restartMap",
  method: "post",
  path: "/servers/{serverId}/game/restart",
  scope: "game:write",
  tag: "Game",
  summary: "Restart the current map",
  params: serverParams,
  status: 204,
});

export const nextMap = defineEndpoint({
  id: "nextMap",
  method: "post",
  path: "/servers/{serverId}/game/next",
  scope: "game:write",
  tag: "Game",
  summary: "Skip to the next map",
  params: serverParams,
  status: 204,
});

export const jumpToMap = defineEndpoint({
  id: "jumpToMap",
  method: "post",
  path: "/servers/{serverId}/game/jump",
  scope: "game:write",
  tag: "Game",
  summary: "Switch to a map on the map list",
  params: serverParams,
  body: z.object({ uid: mapUid }),
  status: 204,
});

export const setPaused = defineEndpoint({
  id: "setPaused",
  method: "put",
  path: "/servers/{serverId}/game/pause",
  scope: "game:write",
  tag: "Game",
  summary: "Pause or resume the match",
  description: "Only for game modes that support pausing.",
  params: serverParams,
  body: z.object({ paused: z.boolean() }),
  status: 204,
});

export const setShowOpponents = defineEndpoint({
  id: "setShowOpponents",
  method: "put",
  path: "/servers/{serverId}/game/show-opponents",
  scope: "game:write",
  tag: "Game",
  summary: "Force the number of visible opponents",
  description: "Takes effect on the next map.",
  params: serverParams,
  body: z.object({
    count: z.int().min(0).max(1000).meta({
      description:
        "0 keeps the players' choice, 1 shows all, any other number shows at least that many",
    }),
  }),
  status: 204,
});

export const triggerScriptEvent = defineEndpoint({
  id: "triggerScriptEvent",
  method: "post",
  path: "/servers/{serverId}/game/script-events",
  scope: "game:write",
  tag: "Game",
  summary: "Send an event to the game mode script",
  params: serverParams,
  body: z.object({
    method: z
      .string()
      .regex(/^[\w.]{1,100}$/)
      .meta({ example: "Trackmania.ForceEndRound" }),
    params: z.array(z.string().max(1000)).max(50).default([]),
  }),
  status: 204,
});

export const loadMatchSettings = defineEndpoint({
  id: "loadMatchSettings",
  method: "post",
  path: "/servers/{serverId}/game/match-settings/load",
  scope: "game:write",
  tag: "Match settings",
  summary: "Load match settings, replacing the map list",
  params: serverParams,
  body: matchSettingsBody,
  status: 204,
});

export const saveMatchSettings = defineEndpoint({
  id: "saveMatchSettings",
  method: "post",
  path: "/servers/{serverId}/game/match-settings/save",
  scope: "game:write",
  tag: "Match settings",
  summary: "Save the match settings and map list",
  params: serverParams,
  body: matchSettingsBody,
  status: 204,
});

export const appendPlaylist = defineEndpoint({
  id: "appendPlaylist",
  method: "post",
  path: "/servers/{serverId}/game/match-settings/append",
  scope: "game:write",
  tag: "Match settings",
  summary:
    "Add the playlist of a match settings file to the end of the map list",
  params: serverParams,
  body: matchSettingsBody,
  status: 204,
});

export const insertPlaylist = defineEndpoint({
  id: "insertPlaylist",
  method: "post",
  path: "/servers/{serverId}/game/match-settings/insert",
  scope: "game:write",
  tag: "Match settings",
  summary: "Insert the playlist of a match settings file after the current map",
  params: serverParams,
  body: matchSettingsBody,
  status: 204,
});

export const setPlayerPoints = defineEndpoint({
  id: "setPlayerPoints",
  method: "put",
  path: "/servers/{serverId}/players/{login}/points",
  scope: "game:write",
  tag: "Points",
  summary: "Set a player's points",
  description: "For game modes with points.",
  params: serverParams.extend({ login: playerLogin }),
  body: z.object({ type: pointsType, points: z.int() }),
  status: 204,
});

export const setTeamPoints = defineEndpoint({
  id: "setTeamPoints",
  method: "put",
  path: "/servers/{serverId}/teams/{teamId}/points",
  scope: "game:write",
  tag: "Points",
  summary: "Set a team's points",
  description: "For team game modes.",
  params: serverParams.extend({
    teamId: z.coerce.number().int().min(0).max(255).meta({ example: 0 }),
  }),
  body: z.object({ type: pointsType, points: z.int() }),
  status: 204,
});

export const getChat = defineEndpoint({
  id: "getChat",
  method: "get",
  path: "/servers/{serverId}/chat",
  scope: "chat:read",
  tag: "Chat",
  summary: "Get recent chat lines",
  description:
    "As the server shows them, so lines may contain formatting tags.",
  params: serverParams,
  status: 200,
  response: dataOf(z.array(z.string())),
});

export const sendChat = defineEndpoint({
  id: "sendChat",
  method: "post",
  path: "/servers/{serverId}/chat",
  scope: "chat:write",
  tag: "Chat",
  summary: "Send a chat message",
  description:
    "Shown like a message from the panel: [Admin] followed by the key's name.",
  params: serverParams,
  body: z.object({
    message: z.string().trim().min(1).max(500),
    login: playerLogin.optional().meta({
      description: "Send only to this player",
    }),
  }),
  status: 204,
});

export const getSettings = defineEndpoint({
  id: "getSettings",
  method: "get",
  path: "/servers/{serverId}/settings",
  scope: "settings:read",
  tag: "Settings",
  summary: "Get the server settings, passwords included",
  params: serverParams,
  status: 200,
  response: dataOf(ServerSettingsSchema),
});

export const updateSettings = defineEndpoint({
  id: "updateSettings",
  method: "patch",
  path: "/servers/{serverId}/settings",
  scope: "settings:write",
  tag: "Settings",
  summary: "Change some server settings",
  description: "Settings left out keep their value.",
  params: serverParams,
  body: ServerSettingsChangesSchema,
  status: 200,
  response: dataOf(ServerSettingsSchema),
});

export const getJoinLink = defineEndpoint({
  id: "getJoinLink",
  method: "get",
  path: "/servers/{serverId}/join-link",
  scope: "settings:read",
  tag: "Settings",
  summary: "Get a link that joins the server from the game",
  description: "Contains the server password when one is set.",
  params: serverParams,
  status: 200,
  response: dataOf(
    z.object({ link: z.string().meta({ example: "#qjoin=login@Trackmania" }) }),
  ),
});

const pluginParams = serverParams.extend({ pluginId: resourceId });
const capabilities = z
  .array(z.string().max(300))
  .max(50)
  .default([])
  .meta({ description: "Capabilities you accept, as listed for the version" });
const pluginVersionString = z
  .string()
  .min(1)
  .max(64)
  .meta({ example: "1.2.0" });
const scriptValues = z.record(z.string().max(100), scriptSettingValue);

export const listPlugins = defineEndpoint({
  id: "listPlugins",
  method: "get",
  path: "/servers/{serverId}/plugins",
  scope: "plugins:read",
  tag: "Plugins",
  summary: "List the plugins installed on the server",
  params: serverParams,
  status: 200,
  response: dataOf(z.array(InstalledPluginSchema)),
});

export const installPlugin = defineEndpoint({
  id: "installPlugin",
  method: "post",
  path: "/servers/{serverId}/plugins",
  scope: "plugins:write",
  tag: "Plugins",
  summary: "Install a plugin from the marketplace",
  description:
    "Accept every capability the version asks for, as the panel's install dialog does. Private uploads can only be installed in the panel.",
  params: serverParams,
  body: z.object({
    slug: z.string().min(1).max(100),
    version: pluginVersionString,
    acceptedCapabilities: capabilities,
  }),
  status: 204,
});

export const reloadPlugins = defineEndpoint({
  id: "reloadPlugins",
  method: "post",
  path: "/servers/{serverId}/plugins/reload",
  scope: "plugins:write",
  tag: "Plugins",
  summary: "Restart the server's plugins",
  params: serverParams,
  status: 204,
});

export const setPluginEnabled = defineEndpoint({
  id: "setPluginEnabled",
  method: "put",
  path: "/servers/{serverId}/plugins/{pluginId}/enabled",
  scope: "plugins:write",
  tag: "Plugins",
  summary: "Enable or disable a plugin",
  params: pluginParams,
  body: z.object({ enabled: z.boolean() }),
  status: 204,
});

export const updatePluginConfig = defineEndpoint({
  id: "updatePluginConfig",
  method: "put",
  path: "/servers/{serverId}/plugins/{pluginId}/config",
  scope: "plugins:write",
  tag: "Plugins",
  summary: "Save a plugin's settings",
  description:
    "Validated against the plugin's settings schema. Secrets left out keep their value; list them in clearedSecrets to remove them.",
  params: pluginParams,
  body: z.object({
    config: z.record(z.string(), z.unknown()),
    clearedSecrets: z.array(z.string().max(100)).max(50).default([]),
  }),
  status: 204,
});

export const changePluginVersion = defineEndpoint({
  id: "changePluginVersion",
  method: "put",
  path: "/servers/{serverId}/plugins/{pluginId}/version",
  scope: "plugins:write",
  tag: "Plugins",
  summary: "Update or roll back a marketplace plugin",
  description:
    "Keeps the plugin's settings and enabled state. Accept the capabilities of the new version.",
  params: pluginParams,
  body: z.object({
    version: pluginVersionString,
    acceptedCapabilities: capabilities,
  }),
  status: 204,
});

export const uninstallPlugin = defineEndpoint({
  id: "uninstallPlugin",
  method: "delete",
  path: "/servers/{serverId}/plugins/{pluginId}",
  scope: "plugins:write",
  tag: "Plugins",
  summary: "Uninstall a plugin",
  description: "Removes its settings and stored data from the server too.",
  params: pluginParams,
  status: 204,
});

export const getServerScriptPlugin = defineEndpoint({
  id: "getServerScriptPlugin",
  method: "get",
  path: "/servers/{serverId}/server-plugin",
  scope: "plugins:read",
  tag: "Server script plugin",
  summary: "Get the dedicated server's script plugin and its settings",
  description: "The dedicated server's own plugin script, not a panel plugin.",
  params: serverParams,
  status: 200,
  response: dataOf(ServerScriptPluginSchema),
});

export const setServerScriptPlugin = defineEndpoint({
  id: "setServerScriptPlugin",
  method: "put",
  path: "/servers/{serverId}/server-plugin",
  scope: "plugins:write",
  tag: "Server script plugin",
  summary: "Load a script plugin on the dedicated server",
  params: serverParams,
  body: z.object({
    name: z.string().max(255).meta({ description: "Empty to unload" }),
    settings: scriptValues.default({}),
    forceReload: z.boolean().default(false),
  }),
  status: 204,
});

export const setServerScriptPluginVariables = defineEndpoint({
  id: "setServerScriptPluginVariables",
  method: "patch",
  path: "/servers/{serverId}/server-plugin/variables",
  scope: "plugins:write",
  tag: "Server script plugin",
  summary: "Set variables of the script plugin",
  params: serverParams,
  body: z.object({ variables: scriptValues }),
  status: 204,
});

export const triggerServerScriptPluginEvent = defineEndpoint({
  id: "triggerServerScriptPluginEvent",
  method: "post",
  path: "/servers/{serverId}/server-plugin/events",
  scope: "plugins:write",
  tag: "Server script plugin",
  summary: "Send an event to the script plugin",
  params: serverParams,
  body: z.object({
    name: z.string().regex(/^[\w.]{1,100}$/),
    params: z.array(z.string().max(1000)).max(50).default([]),
  }),
  status: 204,
});

const filePath = userDataPath.min(1);

export const listFiles = defineEndpoint({
  id: "listFiles",
  method: "get",
  path: "/servers/{serverId}/files",
  scope: "files:read",
  tag: "Files",
  summary: "List a folder on the dedicated server",
  description: "Needs the server's file manager.",
  params: serverParams,
  query: z.object({
    path: userDataPath.default("").meta({
      description: "Folder relative to UserData; empty for UserData itself",
    }),
  }),
  status: 200,
  response: dataOf(z.array(FileEntrySchema)),
});

export const readFile = defineEndpoint({
  id: "readFile",
  method: "get",
  path: "/servers/{serverId}/files/content",
  scope: "files:read",
  tag: "Files",
  summary: "Read a file",
  description:
    "Text comes back as utf8, anything else, such as maps, as base64.",
  params: serverParams,
  query: z.object({ path: filePath }),
  status: 200,
  response: dataOf(
    z.object({
      path: z.string(),
      encoding: z.enum(["utf8", "base64"]),
      content: z.string(),
    }),
  ),
});

export const writeFile = defineEndpoint({
  id: "writeFile",
  method: "put",
  path: "/servers/{serverId}/files/content",
  scope: "files:write",
  tag: "Files",
  summary: "Create or overwrite a file",
  description:
    "Missing folders are created. Send binary files, such as maps, as base64; the body may be up to 16 MB.",
  params: serverParams,
  body: z
    .object({
      path: filePath,
      content: z.string(),
      encoding: z.enum(["utf8", "base64"]).default("utf8"),
    })
    .refine(
      (file) =>
        file.encoding !== "base64" ||
        /^[A-Za-z0-9+/]*={0,2}$/.test(file.content),
      { message: "content is not valid base64", path: ["content"] },
    ),
  maxBodyBytes: 16 * 1024 * 1024,
  status: 204,
});

export const createFolder = defineEndpoint({
  id: "createFolder",
  method: "post",
  path: "/servers/{serverId}/files/folders",
  scope: "files:write",
  tag: "Files",
  summary: "Create a folder",
  params: serverParams,
  body: z.object({ path: filePath }),
  status: 201,
  response: dataOf(FileEntrySchema),
});

export const moveFiles = defineEndpoint({
  id: "moveFiles",
  method: "post",
  path: "/servers/{serverId}/files/move",
  scope: "files:write",
  tag: "Files",
  summary: "Move or rename files and folders",
  params: serverParams,
  body: z.object({
    items: z
      .array(z.object({ from: filePath, to: filePath }))
      .min(1)
      .max(100),
  }),
  status: 200,
  response: dataOf(z.array(FileEntrySchema)),
});

export const deleteFiles = defineEndpoint({
  id: "deleteFiles",
  method: "post",
  path: "/servers/{serverId}/files/delete",
  scope: "files:write",
  tag: "Files",
  summary: "Delete files and folders",
  description: "Folders are deleted with everything in them.",
  params: serverParams,
  body: z.object({ paths: z.array(filePath).min(1).max(100) }),
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
  getCurrentMaps,
  listMapFiles,
  addMaps,
  removeMaps,
  reorderMaps,
  addTmxMap,
  getJukebox,
  addToJukebox,
  clearJukebox,
  removeFromJukebox,
  reorderJukebox,
  getGame,
  getScriptInfo,
  setScript,
  getScriptSettings,
  updateScriptSettings,
  restartMap,
  nextMap,
  jumpToMap,
  setPaused,
  setShowOpponents,
  triggerScriptEvent,
  loadMatchSettings,
  saveMatchSettings,
  appendPlaylist,
  insertPlaylist,
  setPlayerPoints,
  setTeamPoints,
  getChat,
  sendChat,
  getSettings,
  updateSettings,
  getJoinLink,
  listPlugins,
  installPlugin,
  reloadPlugins,
  setPluginEnabled,
  updatePluginConfig,
  changePluginVersion,
  uninstallPlugin,
  getServerScriptPlugin,
  setServerScriptPlugin,
  setServerScriptPluginVariables,
  triggerServerScriptPluginEvent,
  listFiles,
  readFile,
  writeFile,
  createFolder,
  moveFiles,
  deleteFiles,
  listMatches,
  getMatch,
] as const;
