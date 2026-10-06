import { z } from "zod";

export interface PlayerInfo {
  login: string;
  nickName: string;
  playerId: number;
  spectatorStatus: number;
  teamId: number;
}

// Entry in the /ws/servers snapshot
export interface ServerInfo {
  id: string;
  name: string;
  filemanagerUrl?: string;
  isConnected: boolean;
}

// Connection status of a server runtime (/ws/clients and the internal API)
export interface ServerClient {
  serverId: string;
  name: string;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectingAt: number | null;
}

export const chatConfigSchema = z.object({
  manualRouting: z.boolean(),
  messageFormat: z.string().nullable(),
  connectMessage: z.string().nullable(),
  disconnectMessage: z.string().nullable(),
  scriptNameChangeMessage: z.string().nullable(),
  matchSettingsLoadedMessage: z.string().nullable(),
  scriptSettingsSavedMessage: z.string().nullable(),
  mapListChangeMessage: z.string().nullable(),
});

export type ChatConfig = z.infer<typeof chatConfigSchema>;

// Serialized Notifications row as pushed over /ws/notifications
export interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  message: string;
  description: string | null;
  read: boolean;
  timestamp: string;
  serverId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
