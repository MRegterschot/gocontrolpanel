import { z } from "zod";
import { LiveInfo } from "./types/live";
import {
  ChatConfig,
  chatConfigSchema,
  PlayerInfo,
  ServerClient,
} from "./types/server";

// Contract for web -> GBX service calls. All routes require `Authorization: Bearer <service token>`.

export const errorCodes = [
  "BadRequest",
  "Unauthorized",
  "NotFound",
  "ServerNotFound",
  "ServerNotConnected",
  "MethodNotAllowed",
  "GbxCallFailed",
  "RemoveLastMapError",
  "AddMapListError",
  "RemoveMapListError",
  "ReorderMapListError",
  "PlayerNotFound",
  "UpstreamError",
  "InternalError",
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
  };
}

export const internalPaths = {
  servers: "/internal/servers",
  server: (id: string) => `/internal/servers/${id}`,
  live: (id: string) => `/internal/servers/${id}/live`,
  reconnect: (id: string) => `/internal/servers/${id}/reconnect`,
  stopReconnect: (id: string) => `/internal/servers/${id}/stop-reconnect`,
  disconnect: (id: string) => `/internal/servers/${id}/disconnect`,
  resendManialinks: (id: string) => `/internal/servers/${id}/manialinks/resend`,
  pluginManialinks: (id: string, pluginId: string) =>
    `/internal/servers/${encodeURIComponent(id)}/plugins/${encodeURIComponent(pluginId)}/manialinks`,
  reloadPlugins: (id: string) => `/internal/servers/${id}/plugins/reload`,
  gbxCall: (id: string) => `/internal/servers/${id}/gbx/call`,
  gbxMulticall: (id: string) => `/internal/servers/${id}/gbx/multicall`,
  chat: (id: string) => `/internal/servers/${id}/chat`,
  chatConfig: (id: string) => `/internal/servers/${id}/chat-config`,
  script: (id: string) => `/internal/servers/${id}/script`,
  matchSettings: (id: string) => `/internal/servers/${id}/match-settings/load`,
  scriptSettings: (id: string) => `/internal/servers/${id}/script-settings`,
  pause: (id: string) => `/internal/servers/${id}/pause`,
  maps: (id: string) => `/internal/servers/${id}/maps`,
  mapsRemove: (id: string) => `/internal/servers/${id}/maps/remove`,
  mapsOrder: (id: string) => `/internal/servers/${id}/maps/order`,
  playerPoints: (id: string, login: string) =>
    `/internal/servers/${id}/players/${encodeURIComponent(login)}/points`,
  teamPoints: (id: string, teamId: number) =>
    `/internal/servers/${id}/teams/${teamId}/points`,
  serverEvents: "/internal/server-events",
} as const;

const xmlRpcValue: z.ZodType<unknown> = z.unknown();

export const gbxCallBodySchema = z.object({
  method: z.string().min(1),
  params: z.array(xmlRpcValue).default([]),
});
export type GbxCallBody = z.infer<typeof gbxCallBodySchema>;

export const gbxMulticallBodySchema = z.object({
  calls: z.array(gbxCallBodySchema).min(1).max(100),
});
export type GbxMulticallBody = z.infer<typeof gbxMulticallBodySchema>;

export const chatMessageBodySchema = z.object({
  message: z.string().min(1),
  login: z.string().min(1).optional(),
});
export type ChatMessageBody = z.infer<typeof chatMessageBodySchema>;

export const chatConfigBodySchema = chatConfigSchema;
export type ChatConfigBody = ChatConfig;

export interface ChatConfigResult {
  // Config as applied; manualRouting is forced off when the server rejected it
  applied: ChatConfig;
  error?: string;
}

export const scriptNameBodySchema = z.object({ script: z.string().min(1) });
export const matchSettingsBodySchema = z.object({
  filename: z.string().min(1),
});
export const scriptSettingsBodySchema = z.object({
  settings: z.record(z.union([z.string(), z.number(), z.boolean()])),
});
export const pauseBodySchema = z.object({ paused: z.boolean() });
export const mapsBodySchema = z.object({
  filenames: z.array(z.string().min(1)).min(1),
});
export const pointsBodySchema = z.object({
  type: z.enum(["round", "map", "match"]),
  points: z.number().int(),
});
export type PointsBody = z.infer<typeof pointsBodySchema>;

export interface MapsChangeResult {
  count: number;
}

export interface LiveSnapshot {
  liveInfo: LiveInfo;
  activePlayers: PlayerInfo[];
  activeMap: string | null;
}

export type ServerStatus = ServerClient;
