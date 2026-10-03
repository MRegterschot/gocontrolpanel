import {
  deliverServerEvent,
  encodeServerLifecycleEvent,
  internalPaths,
  SERVER_EVENTS_CHANNEL,
  type ApiErrorBody,
  type ChatConfig,
  type ChatConfigResult,
  type GbxCallBody,
  type LiveSnapshot,
  type MapsChangeResult,
  type PointsBody,
  type ServerLifecycleEvent,
  type ServerStatus,
} from "@gcp/shared";
import "server-only";
import config from "./config";
import { logger } from "./logger";
import { getRedisClient } from "./redis";
import { reportException } from "./sentry/report";
import { getErrorMessage } from "./utils";
import { ServerError } from "@/types/responses";

// Client for the internal API of the GBX service, which owns all dedicated server connections

type HttpMethod = "GET" | "POST" | "PUT";
type GbxCall = [method: string, ...params: unknown[]];

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${config.GBX_SERVICE.URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.GBX_SERVICE.TOKEN}`,
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (error) {
    const meta = { type: "gbx", module: "gbx-service", function: "request" };
    logger.error({ meta, error, path }, "GBX service is unreachable");
    throw new ServerError("GBX service is unavailable", "GbxServiceUnavailable");
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const error = (payload as ApiErrorBody | null)?.error;
    throw new ServerError(
      error?.message ?? `GBX service responded with ${res.status}`,
      error?.code ?? "GbxServiceError",
    );
  }

  return (payload as { data: T }).data;
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
  getServer: (serverId: string) =>
    request<ServerStatus>("GET", internalPaths.server(serverId)),
  getLive: (serverId: string) =>
    request<LiveSnapshot>("GET", internalPaths.live(serverId)),

  reconnect: (serverId: string) =>
    request<{ connected: boolean }>("POST", internalPaths.reconnect(serverId)),
  stopReconnect: (serverId: string) =>
    request<null>("POST", internalPaths.stopReconnect(serverId)),
  disconnect: (serverId: string) =>
    request<null>("POST", internalPaths.disconnect(serverId)),
  resendManialinks: (serverId: string) =>
    request<null>("POST", internalPaths.resendManialinks(serverId)),
  reloadPlugins: (serverId: string) =>
    request<null>("POST", internalPaths.reloadPlugins(serverId)),

  sendChat: (serverId: string, message: string, login?: string) =>
    request<null>("POST", internalPaths.chat(serverId), { message, login }),
  applyChatConfig: (serverId: string, chatConfig: ChatConfig) =>
    request<ChatConfigResult>("PUT", internalPaths.chatConfig(serverId), chatConfig),

  setScriptName: (serverId: string, script: string) =>
    request<null>("POST", internalPaths.script(serverId), { script }),
  loadMatchSettings: (serverId: string, filename: string) =>
    request<null>("POST", internalPaths.matchSettings(serverId), { filename }),
  setScriptSettings: (
    serverId: string,
    settings: Record<string, string | number | boolean>,
  ) => request<null>("PUT", internalPaths.scriptSettings(serverId), { settings }),
  setPaused: (serverId: string, paused: boolean) =>
    request<null>("POST", internalPaths.pause(serverId), { paused }),

  addMaps: (serverId: string, filenames: string[]) =>
    request<MapsChangeResult>("POST", internalPaths.maps(serverId), { filenames }),
  removeMaps: (serverId: string, filenames: string[]) =>
    request<MapsChangeResult>("POST", internalPaths.mapsRemove(serverId), {
      filenames,
    }),
  reorderMaps: (serverId: string, filenames: string[]) =>
    request<MapsChangeResult>("PUT", internalPaths.mapsOrder(serverId), {
      filenames,
    }),

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
        await redis.publish(SERVER_EVENTS_CHANNEL, encodeServerLifecycleEvent(e));
      },
    },
  ]);

  if (failures.length === 0) return;

  const meta = { type: "gbx", module: "gbx-service", function: "publishServerEvent" };
  // Errors don't serialize inside nested objects, so log their messages
  const reasons = failures.map((f) => ({ transport: f.transport, error: getErrorMessage(f.error) }));
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
