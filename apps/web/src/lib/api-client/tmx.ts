import type * as Mappacks from "@/services/tmx/mappacks";
import type * as Maps from "@/services/tmx/maps";
import { apiGet } from "./http";

const server = (serverId: string) =>
  `/api/servers/${encodeURIComponent(serverId)}`;

export const searchMaps = (
  serverId: string,
  queryParams: Record<string, string>,
  after?: number,
  count: number = 12,
): ReturnType<typeof Maps.searchMaps> =>
  apiGet(`${server(serverId)}/tmx/maps`, { ...queryParams, after, count });

export const searchMappacks = (
  serverId: string,
  queryParams: Record<string, string>,
  after?: number,
): ReturnType<typeof Mappacks.searchMappacks> =>
  apiGet(`${server(serverId)}/tmx/mappacks`, { ...queryParams, after });
