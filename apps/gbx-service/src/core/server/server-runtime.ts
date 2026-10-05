import type { LiveSnapshot, ServerClient } from "@gcp/shared";
import { ChatService } from "../chat/chat-service";
import { SystemCommands, type SystemCommandServices } from "../chat/system-commands";
import { CommandRouter } from "../chat/command-router";
import { AppError, errorMessage } from "../errors";
import { TypedEventBus } from "../events";
import { ActiveConnection } from "../gbx/active-connection";
import { parseCallback } from "../gbx/callbacks";
import type { GbxConnection, GbxSession, GbxSessionFactory } from "../gbx/connection";
import { LiveState } from "../live/live-state";
import type { Logger } from "../logger";
import { ActionRouter } from "../manialink/action-router";
import { ActionGroup } from "../manialink/components/action-group";
import { ManialinkService } from "../manialink/manialink-service";
import type { TemplateRenderer } from "../manialink/template-renderer";
import { createPluginContext } from "../plugins/plugin-context";
import { PluginHost } from "../plugins/plugin-host";
import type { PackageLoader } from "../plugins/sandbox/package-loader";
import type { PluginDefinition } from "../plugins/sdk";
import type {
  Clock,
  JukeboxStore,
  MapMetadataProvider,
  MapRepository,
  MatchRepository,
  NadeoRecordsProvider,
  NotificationRepository,
  PlayerRepository,
  RecordRepository,
  ServerRecord,
  ServerRepository,
  UserRepository,
} from "../ports";
import { GameEventHandler } from "./game-event-handler";
import { Jukebox } from "./jukebox";
import { LiveSync } from "./live-sync";
import { MapCatalog } from "./map-catalog";
import { MapList } from "./map-list";
import { MatchRecorder } from "./match-recorder";
import { ConnectionSupervisor } from "./connection-supervisor";
import { ServerCommands } from "./server-commands";
import type { ServerEventMap } from "./server-events";

// Shared, server-independent dependencies; one set per process
export interface RuntimeDependencies {
  log: Logger;
  clock: Clock;
  sessionFactory: GbxSessionFactory;
  renderer: TemplateRenderer;
  plugins: PluginDefinition<any>[];
  // Runs marketplace and uploaded plugins; without it only built-ins load
  packages?: PackageLoader;
  servers: ServerRepository;
  players: PlayerRepository;
  users: UserRepository;
  maps: MapRepository;
  matches: MatchRepository;
  records: RecordRepository;
  notifications: NotificationRepository;
  jukebox: JukeboxStore;
  mapMetadata: MapMetadataProvider;
  nadeo: NadeoRecordsProvider;
  connectTimeoutMs?: number;
  retryDelayMs?: number;
  maxRetries?: number;
  initialConnectWindowMs?: number;
  slowRetryDelayMs?: number;
  systemCommands?: SystemCommandServices;
}

const API_VERSION = "2023-04-24";

type ConnectionTarget = Pick<ServerRecord, "host" | "port" | "user" | "password">;

function sameTarget(a: ConnectionTarget, b: ConnectionTarget): boolean {
  return a.host === b.host && a.port === b.port && a.user === b.user && a.password === b.password;
}

// Everything GoControlPanel runs for one dedicated server
export class ServerRuntime {
  readonly events: TypedEventBus<ServerEventMap>;
  readonly state = new LiveState();
  readonly gbx: GbxConnection;
  readonly commands: ServerCommands;
  readonly manialinks: ManialinkService;
  readonly plugins: PluginHost;

  private readonly log: Logger;
  private readonly liveSync: LiveSync;
  private readonly handler: GameEventHandler;
  private readonly supervisor: ConnectionSupervisor;
  private session: GbxSession | null = null;
  private connected = false;
  private connectedAt: number | null = null;
  private name: string | null = null;
  // Details of the last connection attempt, whether or not it succeeded
  private attemptedTarget: ConnectionTarget | null = null;

  constructor(
    readonly serverId: string,
    private readonly deps: RuntimeDependencies,
  ) {
    const { clock, renderer } = deps;
    const log = deps.log.child({ serverId });
    const state = this.state;
    this.log = log;
    this.events = new TypedEventBus<ServerEventMap>(log);
    const bus = this.events;

    const gbx = new ActiveConnection(() => this.session);
    this.gbx = gbx;

    const chat = new ChatService(gbx, state, log);
    const actions = new ActionRouter(log);
    this.manialinks = new ManialinkService(gbx, log);
    const manialinkDeps = { renderer, manialinks: this.manialinks, actions };
    const actionGroup = new ActionGroup(manialinkDeps);
    const mapList = new MapList(gbx, log);
    const catalog = new MapCatalog(deps.maps, deps.mapMetadata, clock, log);

    const recorder = new MatchRecorder({
      serverId,
      state,
      gbx,
      matches: deps.matches,
      records: deps.records,
      users: deps.users,
      log,
    });
    this.liveSync = new LiveSync({
      gbx,
      state,
      bus,
      players: deps.players,
      catalog,
      recorder,
      log,
    });
    this.commands = new ServerCommands({ gbx, state, bus, chat, mapList, log });

    const systemCommands = new SystemCommands({
      serverId, state, gbx, clock, log,
      reply: (login, message) => chat.sendTo(login, message),
      connected: () => this.connected,
      connectedAt: () => this.connectedAt,
      loadedPlugins: () => this.plugins.loadedIds(),
      services: deps.systemCommands,
    });

    const commandRouter = new CommandRouter(
      log,
      (login, message) => chat.sendTo(login, message),
      () => ({ enabled: state.enableHelpCommand, provider: this.plugins }),
      (name, login) => systemCommands.dispatch(name, login),
    );

    this.plugins = new PluginHost(
      deps.plugins,
      (definition, record) =>
        createPluginContext(
          {
            serverId,
            serverName: () => this.name,
            log,
            state,
            bus,
            gbx,
            chat,
            commands: commandRouter,
            serverCommands: this.commands,
            actions,
            manialinkDeps,
            actionGroup,
            mapList,
            catalog,
            records: deps.records,
            servers: deps.servers,
            notifications: deps.notifications,
            nadeo: deps.nadeo,
            clock,
            manialinks: this.manialinks,
            disablePlugin: (pluginId, name, reason) => this.disablePlugin(pluginId, name, reason),
          },
          definition,
          record,
        ),
      log,
      async (record) => (deps.packages ? deps.packages.resolve(record) : null),
    );

    this.handler = new GameEventHandler({
      gbx,
      state,
      bus,
      chat,
      commands: commandRouter,
      actions,
      players: deps.players,
      liveSync: this.liveSync,
      recorder,
      jukebox: new Jukebox(serverId, deps.jukebox, gbx, log),
      clock,
      log,
    });

    bus.on("playerConnect", (player) => this.manialinks.onPlayerConnect(player.login));
    bus.on("playerDisconnect", (login) => this.manialinks.onPlayerDisconnect(login));
    bus.on("modeChange", () => this.syncPlugins(false));

    this.supervisor = new ConnectionSupervisor({
      connect: () => this.connectOnce(),
      clock,
      log,
      retryDelayMs: deps.retryDelayMs,
      maxRetries: deps.maxRetries,
      initialConnectWindowMs: deps.initialConnectWindowMs,
      slowRetryDelayMs: deps.slowRetryDelayMs,
      onReconnectScheduled: (at) => bus.emit("reconnect", "try", at),
      onReconnectStopped: () => bus.emit("reconnect", "stop", null),
    });
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get serverName(): string | null {
    return this.name;
  }

  status(): ServerClient {
    const reconnectAt = this.supervisor.reconnectAt;
    return {
      serverId: this.serverId,
      name: this.name ?? "Unknown Server",
      isConnected: this.connected,
      isReconnecting: reconnectAt !== null,
      reconnectingAt: reconnectAt,
    };
  }

  snapshot(): LiveSnapshot {
    return {
      liveInfo: this.state.liveInfo,
      activePlayers: this.state.activePlayers,
      activeMap: this.state.activeMapUid,
    };
  }

  start(): Promise<boolean> {
    return this.supervisor.start();
  }

  reconnect(): Promise<boolean> {
    return this.supervisor.triggerNow();
  }

  stopReconnect(): void {
    this.supervisor.stop();
  }

  // Manual disconnect: stays offline until reconnect() is called
  async disconnect(): Promise<void> {
    this.supervisor.stop();
    await this.closeSession();
  }

  async dispose(): Promise<void> {
    this.supervisor.stop();
    await this.closeSession();
    this.events.clear();
  }

  async reloadPlugins(): Promise<void> {
    this.assertConnected();
    await this.plugins.reload(this.state.plugins, this.state.liveInfo.type);
  }

  // A plugin broke its limits or was yanked: turn it off for this server and tell the admins
  async disablePlugin(pluginId: string, name: string, reason: string): Promise<void> {
    await this.deps.servers.setPluginEnabled(this.serverId, pluginId, false);
    try {
      const notifications = await this.deps.notifications.createForServerAdmins({
        serverId: this.serverId,
        type: "pluginDisabled",
        message: `Plugin ${name} was turned off on ${this.name ?? "the server"}`,
        description: reason,
      });
      this.events.emit("adminCommand", notifications);
    } catch (error) {
      this.log.error({ err: error, pluginId: name }, "Failed to notify admins about a disabled plugin");
    }
    await this.refreshPlugins();
  }

  // server_plugins changed in the database
  async refreshPlugins(): Promise<void> {
    this.state.plugins = await this.deps.servers.findPlugins(this.serverId);
    if (this.connected) await this.syncPlugins(true);
  }

  // servers row changed. Only new connection details restart the connection; any other edit must not
  // undo a manual disconnect or revive a server whose retries were stopped.
  async applyServerUpdate(): Promise<void> {
    const record = await this.deps.servers.findById(this.serverId);
    if (!record) return;

    this.name = record.name;
    this.state.enableHelpCommand = record.enableHelpCommand;
    await this.refreshChatConfig(record.chat);

    // No attempt yet: the one that is about to run reads this record anyway
    if (!this.attemptedTarget || sameTarget(this.attemptedTarget, record)) return;

    this.log.info("Connection details changed, reconnecting");
    // Not awaited: the caller does not need to wait for the game server
    void this.restart();
  }

  // The stored chat config changed (saved while the service could not be reached, for instance)
  private async refreshChatConfig(chat: ServerRecord["chat"]): Promise<void> {
    const previous = this.state.chat;
    this.state.chat = chat;

    if (!this.connected || !previous || previous.manualRouting === chat.manualRouting) return;
    try {
      await this.gbx.call("ChatEnableManualRouting", chat.manualRouting);
    } catch (error) {
      this.log.error({ err: error }, "Failed to apply manual chat routing");
    }
  }

  private async restart(): Promise<void> {
    try {
      await this.disconnect();
      await this.start();
    } catch (error) {
      this.log.error({ err: error }, "Failed to reconnect after the connection details changed");
    }
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new AppError("ServerNotConnected", "Server is not connected");
    }
  }

  private syncPlugins(updateConfigs: boolean): Promise<void> {
    return this.plugins.sync(this.state.plugins, this.state.liveInfo.type, updateConfigs);
  }

  private async connectOnce(): Promise<void> {
    const server = await this.deps.servers.findById(this.serverId);
    if (!server) {
      throw new AppError("ServerNotFound", `Server ${this.serverId} not found`);
    }
    this.name = server.name;
    this.attemptedTarget = server;

    // A fresh session per attempt, so listeners never pile up across reconnects
    const session = this.deps.sessionFactory();
    await session.connect(server.host, server.port, this.deps.connectTimeoutMs ?? 3000);

    try {
      await session.call("Authenticate", server.user, server.password);
    } catch (error) {
      await session.disconnect().catch(() => undefined);
      throw new AppError("GbxCallFailed", "Failed to authenticate with GBX server", {
        cause: error,
      });
    }

    this.session = session;
    session.onDisconnect(() => void this.onSessionLost(session));

    try {
      await this.initialize(server, session);
    } catch (error) {
      this.log.error({ err: error }, "Failed to initialize GBX session");
      this.session = null;
      await session.disconnect().catch(() => undefined);
      throw error;
    }

    this.connected = true;
    this.connectedAt = this.deps.clock.now();
    this.log.info({ name: server.name }, "Connected to GBX server");
    this.events.emit("connect");

    await this.syncPlugins(false);
  }

  private async initialize(server: ServerRecord, session: GbxSession): Promise<void> {
    await session.call("SetApiVersion", API_VERSION);
    await session.call("EnableCallbacks", true);
    await session.callScript("XmlRpc.EnableCallbacks", "true");
    await session.callScript("Trackmania.Event.SetCurRaceCheckpointsMode", "always");

    this.state.reset();
    this.manialinks.clear();

    await session.call("ChatEnableManualRouting", server.chat.manualRouting);
    this.state.chat = server.chat;
    this.state.enableHelpCommand = server.enableHelpCommand;
    this.state.plugins = server.plugins;

    // Late callbacks from a replaced session must not touch the new state
    session.onCallback((method, data) => {
      if (session === this.session) this.onCallback(method, data);
    });

    await this.liveSync.syncMap();
    await this.liveSync.syncLiveInfo();
  }

  private onCallback(method: string, data: unknown): void {
    let event;
    try {
      event = parseCallback(method, data);
    } catch (error) {
      this.log.warn({ err: error, method }, "Malformed GBX callback");
      return;
    }
    if (event) void this.handler.handle(event);
  }

  private async onSessionLost(session: GbxSession): Promise<void> {
    if (session !== this.session) return;
    this.session = null;

    if (!this.connected) return;
    this.connected = false;
    this.connectedAt = null;
    this.log.info("Disconnected from GBX server");

    await this.plugins.unloadAll();
    this.manialinks.clear();
    this.events.emit("disconnect");
    this.supervisor.handleConnectionLost();
  }

  private async closeSession(): Promise<void> {
    const session = this.session;
    if (!session) return;

    if (this.connected) {
      // Unload first so widgets are removed while the session can still send
      await this.plugins.unloadAll();
      this.connected = false;
      this.connectedAt = null;
      this.events.emit("disconnect");
    }

    this.session = null;
    this.manialinks.clear();
    try {
      await session.disconnect();
    } catch (error) {
      this.log.warn({ err: errorMessage(error) }, "Error while closing GBX session");
    }
  }
}
