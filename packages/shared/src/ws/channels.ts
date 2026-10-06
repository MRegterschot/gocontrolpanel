import { DetailedPlayerChat } from "../types/gbx";
import { ActiveRound, LiveInfo, PlayerRound, Team } from "../types/live";
import {
  NotificationDto,
  PlayerInfo,
  ServerClient,
  ServerInfo,
} from "../types/server";

// Wire format of every socket message: { type, data }
export interface WsMessage<TType extends string, TData> {
  type: TType;
  data: TData;
}

export const wsPaths = {
  servers: "/ws/servers",
  clients: "/ws/clients",
  notifications: "/ws/notifications",
  live: (serverId: string) => `/ws/live/${serverId}`,
  map: (serverId: string) => `/ws/map/${serverId}`,
  players: (serverId: string) => `/ws/players/${serverId}`,
} as const;

export type ServersChannelMessage =
  | WsMessage<"servers", ServerInfo[]>
  | WsMessage<"connect", { serverId: string }>
  | WsMessage<"disconnect", { serverId: string }>;

export type ClientsChannelMessage =
  | WsMessage<"clients", ServerClient[]>
  | WsMessage<"connect", { serverId: string }>
  | WsMessage<"disconnect", { serverId: string }>
  | WsMessage<
      "reconnect",
      { serverId: string; type: "try" | "stop"; time: number | null }
    >;

export type NotificationsChannelMessage = WsMessage<
  "adminCommand",
  NotificationDto
>;

export type LiveChannelMessage =
  | WsMessage<
      | "beginMatch"
      | "personalBest"
      | "endRound"
      | "warmUpStart"
      | "warmUpEnd"
      | "warmUpStartRound"
      | "updatedSettings"
      | "elimination",
      { info: LiveInfo }
    >
  | WsMessage<
      | "finish"
      | "checkpoint"
      | "giveUp"
      | "beginRound"
      | "playerInfoChanged"
      | "playerDisconnect",
      { round: ActiveRound }
    >
  | WsMessage<"playerConnect", { live: LiveInfo }>
  | WsMessage<"beginMap" | "endMap", { mapUid: string }>
  | WsMessage<"playerUpdated", { round: PlayerRound }>
  | WsMessage<"teamUpdated", { team: Team }>
  | WsMessage<"playerChat", { chat: DetailedPlayerChat }>;

export type MapChannelMessage =
  | WsMessage<"activeMap", string | undefined>
  | WsMessage<"startMap" | "endMap", { mapUid: string }>;

export type PlayersChannelMessage =
  | WsMessage<"playerList", PlayerInfo[]>
  | WsMessage<"playerConnect" | "playerInfo", PlayerInfo>
  | WsMessage<"playerDisconnect", { login: string }>;
