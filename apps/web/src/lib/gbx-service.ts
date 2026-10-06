import {
  deliverServerEvent,
  encodeServerLifecycleEvent,
  internalPaths,
  SERVER_EVENTS_CHANNEL,
  type ChatConfig,
  type ChatConfigResult,
  type GbxCallBody,
  type MapsChangeResult,
  type PluginManialinkSnapshot,
  type PointsBody,
  type ServerLifecycleEvent,
} from "@gcp/shared";
import "server-only";
import config from "./config";
import { logger } from "./logger";
import { getRedisClient } from "./redis";
import { reportException } from "./sentry/report";
import {
  LONG_TIMEOUT_MS,
  serviceRequest,
  type HttpMethod,
} from "./service-request";
import { getErrorMessage } from "./utils";

// Client for the internal API of the GBX service, which owns all dedicated server connections

type GbxCall = [method: string, ...params: unknown[]];

function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const meta = { type: "gbx", module: "gbx-service", function: "request" };
  return serviceRequest<T>(method, path, body, {
    baseUrl: config.GBX_SERVICE.URL,
    token: config.GBX_SERVICE.TOKEN,
    log: { error: (obj, msg) => logger.error({ meta, ...obj }, msg) },
    ...options,
  });
}

export interface GbxClient {
  call<T = any>(method: string, ...params: unknown[]): Promise<T>;
  multicall<T extends unknown[] = any[]>(calls: GbxCall[]): Promise<T>;
}

// Plain dedicated server calls, limited to the service's passthrough allowlist
export function getGbxClient(serverId: string): GbxClient {
  return {
    call: (method, ...params) =>
      request("POST", internalPaths.gbxCall(serverId), {
        method,
        params,
      } satisfies GbxCallBody),
    multicall: (calls) =>
      request("POST", internalPaths.gbxMulticall(serverId), {
        calls: calls.map(([method, ...params]) => ({ method, params })),
      }),
  };
}

// Commands that also update live state, plugins or chat announcements in the service
export const gbxService = {
  pluginManialinks: (serverId: string, pluginId: string) =>
    request<PluginManialinkSnapshot>(
      "GET",
      internalPaths.pluginManialinks(serverId, pluginId),
    ),
  reconnect: (serverId: string) =>
    request<{ connected: boolean }>(
      "POST",
      internalPaths.reconnect(serverId),
      undefined,
      {
        timeoutMs: LONG_TIMEOUT_MS,
      },
    ),
  stopReconnect: (serverId: string) =>
    request<null>("POST", internalPaths.stopReconnect(serverId)),
  disconnect: (serverId: string) =>
    request<null>("POST", internalPaths.disconnect(serverId)),
  resendManialinks: (serverId: string) =>
    request<null>("POST", internalPaths.resendManialinks(serverId)),
  reloadPlugins: (serverId: string) =>
    request<null>("POST", internalPaths.reloadPlugins(serverId), undefined, {
      timeoutMs: LONG_TIMEOUT_MS,
    }),

  sendChat: (serverId: string, message: string, login?: string) =>
    request<null>("POST", internalPaths.chat(serverId), { message, login }),
  applyChatConfig: (serverId: string, chatConfig: ChatConfig) =>
    request<ChatConfigResult>(
      "PUT",
      internalPaths.chatConfig(serverId),
      chatConfig,
    ),

  setScriptName: (serverId: string, script: string) =>
    request<null>("POST", internalPaths.script(serverId), { script }),
  loadMatchSettings: (serverId: string, filename: string) =>
    request<null>(
      "POST",
      internalPaths.matchSettings(serverId),
      { filename },
      { timeoutMs: LONG_TIMEOUT_MS },
    ),
  setScriptSettings: (
    serverId: string,
    settings: Record<string, string | number | boolean>,
  ) =>
    request<null>("PUT", internalPaths.scriptSettings(serverId), { settings }),
  setPaused: (serverId: string, paused: boolean) =>
    request<null>("POST", internalPaths.pause(serverId), { paused }),

  // Changing a long map list makes the game server load every file, so these get the long limit
  addMaps: (serverId: string, filenames: string[]) =>
    request<MapsChangeResult>(
      "POST",
      internalPaths.maps(serverId),
      { filenames },
      { timeoutMs: LONG_TIMEOUT_MS },
    ),
  removeMaps: (serverId: string, filenames: string[]) =>
    request<MapsChangeResult>(
      "POST",
      internalPaths.mapsRemove(serverId),
      { filenames },
      { timeoutMs: LONG_TIMEOUT_MS },
    ),
  reorderMaps: (serverId: string, filenames: string[]) =>
    request<MapsChangeResult>(
      "PUT",
      internalPaths.mapsOrder(serverId),
      { filenames },
      { timeoutMs: LONG_TIMEOUT_MS },
    ),

  setPlayerPoints: (
    serverId: string,
    login: string,
    type: PointsBody["type"],
    points: number,
  ) =>
    request<null>("PUT", internalPaths.playerPoints(serverId, login), {
      type,
      points,
    }),
  setTeamPoints: (
    serverId: string,
    teamId: number,
    type: PointsBody["type"],
    points: number,
  ) =>
    request<null>("PUT", internalPaths.teamPoints(serverId, teamId), {
      type,
      points,
    }),
};

// Tells the service a server row changed. The database write already succeeded, so this never throws.
// HTTP applies the change before the caller continues; if that call fails the event goes out on the
// Redis channel the service subscribes to. A service that is down reads the database when it starts.
export async function publishServerEvent(event: ServerLifecycleEvent) {
  const { deliveredBy, failures } = await deliverServerEvent(event, [
    {
      name: "http",
      send: async (e) => {
        await request<null>("POST", internalPaths.serverEvents, e);
      },
    },
    {
      name: "redis",
      send: async (e) => {
        const redis = await getRedisClient();
        await redis.publish(
          SERVER_EVENTS_CHANNEL,
          encodeServerLifecycleEvent(e),
        );
      },
    },
  ]);

  if (failures.length === 0) return;

  const meta = {
    type: "gbx",
    module: "gbx-service",
    function: "publishServerEvent",
  };
  // Errors don't serialize inside nested objects, so log their messages
  const reasons = failures.map((f) => ({
    transport: f.transport,
    error: getErrorMessage(f.error),
  }));
  if (deliveredBy) {
    logger.warn(
      { meta, event, deliveredBy, failures: reasons },
      "GBX service request failed, event delivered over Redis instead",
    );
    return;
  }

  logger.error(
    { meta, event, failures: reasons },
    "Failed to notify the GBX service, it stays out of date until it restarts",
  );
  reportException(failures[0].error, meta);
}
