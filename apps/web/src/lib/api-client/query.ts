import { ServerError, ServerResponse } from "@/types/responses";

// TanStack Query wants a thrown error to mark a query failed, the API client returns { data, error }
export async function unwrap<T>(
  response: Promise<ServerResponse<T>>,
  name = "ApiError",
): Promise<T> {
  const { data, error } = await response;
  if (error) {
    throw new ServerError(error, name);
  }
  return data;
}

// One place for the cache keys, so a write can invalidate the reads it affects
export const queryKeys = {
  server: (serverId: string) => ["servers", serverId] as const,
  banlist: (serverId: string) => ["servers", serverId, "banlist"] as const,
  blacklist: (serverId: string) => ["servers", serverId, "blacklist"] as const,
  guestlist: (serverId: string) => ["servers", serverId, "guestlist"] as const,
  players: (serverId: string) => ["servers", serverId, "players"] as const,
  jukebox: (serverId: string) => ["servers", serverId, "jukebox"] as const,
  mapList: (serverId: string) => ["servers", serverId, "maps"] as const,
  localMaps: (serverId: string) => ["servers", serverId, "local-maps"] as const,
  scripts: (serverId: string) => ["servers", serverId, "scripts"] as const,
  settings: (serverId: string) => ["servers", serverId, "settings"] as const,
  serverPlugin: (serverId: string) =>
    ["servers", serverId, "server-plugin"] as const,
  ecmApiKey: (serverId: string) =>
    ["servers", serverId, "ecm", "api-key"] as const,
  codriverServer: (serverId: string) =>
    ["servers", serverId, "codriver"] as const,
  codriverPanel: ["codriver", "panel"] as const,
  codriverAccess: (serverId: string, login: string) =>
    ["codriver", "access", serverId, login] as const,
  map: (uid: string) => ["maps", uid] as const,
  notifications: ["notifications"] as const,
  rolesMinimal: ["roles", "minimal"] as const,
  serversMinimal: ["servers", "minimal"] as const,
  users: (field: string, ids: string[]) => ["users", field, ...ids] as const,
  hetzner: (projectId: string, what: string) =>
    ["hetzner", projectId, what] as const,
  club: (clubId: number, what: string, ...rest: (string | number)[]) =>
    ["nadeo", "clubs", clubId, what, ...rest] as const,
  paginated: (
    endpoint: string,
    pagination: { pageIndex: number; pageSize: number },
    sorting: { field: string; order: string },
    filter: string,
  ) => ["paginated", endpoint, pagination, sorting, filter] as const,
};
