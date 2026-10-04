import type * as MapActions from "@/services/gbx/map";
import type * as Player from "@/services/gbx/player";
import type * as Server from "@/services/gbx/server";
import type * as ServerPlugin from "@/services/gbx/server-plugin";
import { apiGet } from "./http";

const server = (serverId: string) =>
  `/api/servers/${encodeURIComponent(serverId)}`;

export const getPlayerList = (
  serverId: string,
): ReturnType<typeof Player.getPlayerList> =>
  apiGet(`${server(serverId)}/players`);

export const getBanList = (
  serverId: string,
): ReturnType<typeof Player.getBanList> =>
  apiGet(`${server(serverId)}/banlist`);

export const getBlacklist = (
  serverId: string,
): ReturnType<typeof Player.getBlacklist> =>
  apiGet(`${server(serverId)}/blacklist`);

export const getGuestlist = (
  serverId: string,
): ReturnType<typeof Player.getGuestlist> =>
  apiGet(`${server(serverId)}/guestlist`);

export const getJukebox = (
  serverId: string,
): ReturnType<typeof MapActions.getJukebox> =>
  apiGet(`${server(serverId)}/jukebox`);

export const getLocalMaps = (
  serverId: string,
): ReturnType<typeof Server.getLocalMaps> =>
  apiGet(`${server(serverId)}/local-maps`);

export const getServerSettings = (
  serverId: string,
): ReturnType<typeof Server.getServerSettings> =>
  apiGet(`${server(serverId)}/settings`);

export const getServerPlugin = (
  serverId: string,
): ReturnType<typeof ServerPlugin.getServerPlugin> =>
  apiGet(`${server(serverId)}/server-plugin`);
