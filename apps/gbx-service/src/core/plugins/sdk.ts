import type { GameModeType, NotificationDto, PlayerInfo } from "@gcp/shared";
import type { z } from "zod";
import type { ChatService } from "../chat/chat-service";
import type { CommandHandler } from "../chat/command-router";
import type { GbxConnection } from "../gbx/connection";
import type { LiveState } from "../live/live-state";
import type { Logger } from "../logger";
import type { ActionHandler } from "../manialink/action-router";
import type { ActionButton } from "../manialink/components/action-group";
import type { Manialink, ManialinkOptions } from "../manialink/components/manialink";
import type { Window, WindowOptions } from "../manialink/components/window";
import type {
  EcmClient,
  LocalRecord,
  MapRecord,
  NadeoRecordsProvider,
} from "../ports";
import type { MapList } from "../server/map-list";
import type { ServerEventMap } from "../server/server-events";

// Read-only view of the live state handed to plugins
export type LiveView = Pick<
  LiveState,
  | "liveInfo"
  | "activePlayers"
  | "activeMapUid"
  | "roundNumber"
  | "isReverseCup"
  | "findActivePlayer"
  | "reverseCupGetPlayerStatus"
  | "reverseCupGetPointsRepartition"
>;

export interface PluginUi {
  widget(options: ManialinkOptions): Manialink;
  window(options: WindowOptions): Window;
  addAction(button: ActionButton): void;
  removeAction(name: string): void;
}

// Everything a plugin may use. Registrations are scoped to the plugin and undone on unload.
export interface PluginContext<Config = unknown> {
  readonly pluginId: string;
  readonly serverId: string;
  readonly log: Logger;
  readonly live: LiveView;
  // Full GBX access for built-ins; third-party plugins will get a capability-scoped client (PM-11)
  readonly gbx: GbxConnection;
  readonly chat: Pick<ChatService, "send" | "sendTo">;
  readonly ui: PluginUi;
  readonly mapList: MapList;
  readonly nadeo: NadeoRecordsProvider;
  readonly ecm: EcmClient;

  config(): Config | null;
  serverName(): string | null;
  // Persists a new config for this plugin and notifies the instance
  saveConfig(config: Config): Promise<void>;

  on<K extends keyof ServerEventMap>(
    event: K,
    handler: (...args: ServerEventMap[K]) => unknown,
  ): void;
  command(name: string, handler: CommandHandler): void;
  action(pattern: string, handler: ActionHandler): () => void;
  // Cancelled automatically on unload
  setTimeout(fn: () => void, ms: number): () => void;
  sleep(ms: number): Promise<void>;

  players: {
    // Active player if known, otherwise fetched from the server
    get(login: string): Promise<PlayerInfo>;
  };
  maps: {
    findByUid(uid: string): Promise<MapRecord | null>;
    findByFileNames(fileNames: string[]): Promise<MapRecord[]>;
  };
  records: {
    local(mapUid: string): Promise<LocalRecord | null>;
    forPlayers(mapUid: string, logins: string[]): Promise<LocalRecord[]>;
  };
  notifyAdmins(message: string, description?: string): Promise<NotificationDto[]>;
  server: {
    // Raw script change without the configured chat announcement
    setScriptName(script: string): Promise<void>;
    setPaused(paused: boolean): Promise<void>;
  };
}

export interface PluginInstance {
  // Called once after load (widgets, initial state)
  start?(): unknown;
  // Called before the context is torn down
  stop?(): unknown;
  onConfigUpdate?(): unknown;
}

export interface PluginDefinition<Config = unknown> {
  // Matches plugins.name in the database
  id: string;
  // Empty means every mode
  gamemodes?: readonly GameModeType[];
  helpText?: string;
  configSchema?: z.ZodType<Config, z.ZodTypeDef, unknown>;
  create(ctx: PluginContext<Config>): PluginInstance;
}

export function definePlugin<Config>(
  definition: PluginDefinition<Config>,
): PluginDefinition<Config> {
  return definition;
}
