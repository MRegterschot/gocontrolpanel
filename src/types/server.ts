import { ServerPluginsWithPlugin } from "@/actions/database/server-only/gbx";
import { LiveInfo } from "./live";
import { PlayerInfo } from "./player";

export interface ServerInfo {
  id: string;
  name: string;
  filemanagerUrl?: string;
  isConnected: boolean;
}

export interface ChatConfig {
  manualRouting: boolean;
  messageFormat: string | null;
  connectMessage: string | null;
  disconnectMessage: string | null;
}

export interface ServerClientInfo {
  activeMap?: string;
  activePlayers: PlayerInfo[];
  liveInfo: LiveInfo;
  chat?: ChatConfig;
  plugins: ServerPluginsWithPlugin[];
}
