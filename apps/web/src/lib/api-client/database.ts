import type * as Ecircuitmania from "@/services/database/ecircuitmania";
import type * as Maps from "@/services/database/maps";
import type * as Matches from "@/services/database/matches";
import type * as Notifications from "@/services/database/notifications";
import type * as Records from "@/services/database/records";
import type * as Roles from "@/services/database/roles";
import type * as ServerPlugins from "@/services/database/server-plugins";
import type * as Servers from "@/services/database/servers";
import type * as Users from "@/services/database/users";
import { apiGet } from "./http";

// The database returns Date objects, so every call turns the timestamps back into Dates
const dates = { dates: true };
const server = (serverId: string) =>
  `/api/servers/${encodeURIComponent(serverId)}`;

export const getNotifications = (): ReturnType<
  typeof Notifications.getNotifications
> => apiGet("/api/notifications", undefined, dates);

export const getRolesMinimal = (): ReturnType<typeof Roles.getRolesMinimal> =>
  apiGet("/api/roles/minimal", undefined, dates);

export const getServersMinimal = (): ReturnType<
  typeof Servers.getServersMinimal
> => apiGet("/api/servers/minimal", undefined, dates);

export const getUsersByIds = (
  ids: string[],
): ReturnType<typeof Users.getUsersByIds> =>
  apiGet("/api/users/by-ids", { ids }, dates);

export const getUsersByLogins = (
  logins: string[],
): ReturnType<typeof Users.getUsersByLogins> =>
  apiGet("/api/users/by-logins", { logins }, dates);

export const searchUser = (
  search: string,
): ReturnType<typeof Users.searchUser> =>
  apiGet("/api/users/search", { search }, dates);

export const getMapByUid = (uid: string): ReturnType<typeof Maps.getMapByUid> =>
  apiGet(`/api/maps/${encodeURIComponent(uid)}`, undefined, dates);

export const getMapList = (
  serverId: string,
  count?: number,
  start: number = 0,
): ReturnType<typeof Maps.getMapList> =>
  apiGet(`${server(serverId)}/maps`, { count, start }, dates);

export const exportRecords = (
  serverId: string,
  mapUid?: string,
): ReturnType<typeof Records.exportRecords> =>
  apiGet(`${server(serverId)}/records`, { mapUid }, dates);

export const exportMatchToCSV = (
  serverId: string,
  matchId: string,
  headers?: string[],
  values?: string[],
): ReturnType<typeof Matches.exportMatchToCSV> =>
  apiGet(
    `${server(serverId)}/matches/${encodeURIComponent(matchId)}/export`,
    { headers, values },
    dates,
  );

export const exportServerPluginConfig = (
  serverId: string,
  pluginId: string,
): ReturnType<typeof ServerPlugins.exportServerPluginConfig> =>
  apiGet(
    `${server(serverId)}/plugins/${encodeURIComponent(pluginId)}/export`,
    undefined,
    dates,
  );

export const getEcmApiKey = (
  serverId: string,
  signal?: AbortSignal,
): ReturnType<typeof Ecircuitmania.getEcmApiKey> =>
  apiGet(`${server(serverId)}/ecm/api-key`, undefined, { signal });
