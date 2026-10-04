import type {
  ActiveRound,
  DetailedPlayerChat,
  LiveInfo,
  PlayerInfo,
  PlayerRound,
  Scores,
  Team,
  Waypoint,
  WaypointEvent,
} from "./game-types";

export type * from "./game-types";

// Server events a plugin can subscribe to with ctx.on()
export interface PluginEvents {
  connect: [];
  disconnect: [];
  playerConnect: [player: PlayerInfo];
  playerConnectInfo: [liveInfo: LiveInfo];
  playerDisconnect: [login: string];
  playerDisconnectInfo: [round: ActiveRound];
  playerInfo: [player: PlayerInfo];
  playerInfoChanged: [round: ActiveRound];
  playerList: [players: PlayerInfo[]];
  playerChat: [chat: DetailedPlayerChat];
  beginMap: [mapUid: string];
  endMap: [mapUid: string];
  startMap: [mapUid: string];
  beginMatch: [liveInfo: LiveInfo];
  startRound: [];
  beginRound: [round: ActiveRound];
  endRound: [scores: Scores];
  "live-endRound": [liveInfo: LiveInfo];
  scores: [scores: Scores];
  checkpoint: [waypoint: Waypoint];
  "live-checkpoint": [round: ActiveRound];
  finish: [waypoint: Waypoint];
  "live-finish": [round: ActiveRound];
  personalBest: [liveInfo: LiveInfo];
  giveUp: [event: WaypointEvent];
  "live-giveUp": [round: ActiveRound];
  startLine: [event: WaypointEvent];
  skipOutro: [event: WaypointEvent];
  warmUpStart: [liveInfo: LiveInfo];
  warmUpEnd: [liveInfo: LiveInfo];
  warmUpStartRound: [liveInfo: LiveInfo];
  updatedSettings: [liveInfo: LiveInfo];
  elimination: [liveInfo: LiveInfo];
  modeChange: [type: string];
  playerUpdated: [round: PlayerRound];
  teamUpdated: [team: Team];
}

export type PluginEventName = keyof PluginEvents;

export interface Vector2 {
  x: number;
  y: number;
}

export interface WidgetOptions {
  // Unique within the plugin: letters, digits, - and _
  id: string;
  // A template of the package, without templates/ and .hbs: "widgets/board"
  template: string;
  // Show to one player only
  login?: string;
  // Pair the page with "<template>-update" for data changes (default true)
  withUpdate?: boolean;
  position?: Vector2;
  size?: Vector2;
  title?: string;
  hideWhileDriving?: boolean;
  // Available as `data` in the template
  data?: unknown;
}

export interface WindowOptions extends Omit<WidgetOptions, "login"> {
  login: string;
  title: string;
  onClose?: () => void;
}

export interface Widget {
  // The manialink id players' clients see
  readonly id: string;
  display(): void;
  // Send only the data page; the main page keeps its client-side state
  update(): void;
  hide(): void;
  destroy(): void;
  setData(data: unknown): void;
  setTitle(title: string): void;
  setPosition(position: Vector2): void;
  setSize(size: Vector2): void;
}

export interface Window extends Widget {
  close(): void;
}

export interface ActionButton {
  name: string;
  icon: string;
  type?: "image" | "text";
  // Action name registered with ctx.action()
  action?: string;
}

export interface ManialinkAnswer {
  login: string;
  // The action as sent by the client, without the plugin prefix
  action: string;
  entries: Record<string, string>;
}

export interface LocalRecord {
  login: string | null;
  time: number;
  nickName: string | null;
}

export interface MapRecord {
  uid: string;
  name: string;
  fileName: string;
  author: string;
  authorNickname: string;
  thumbnailUrl: string | null;
}

export interface LeaderboardEntry {
  accountId: string;
  score: number;
}

export interface HttpRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  // Default 10 seconds, at most 30
  timeoutMs?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  json<T = unknown>(): T;
}

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export type CommandHandler = (args: string[], login: string) => unknown;
export type ActionHandler = (answer: ManialinkAnswer, params: Record<string, string>) => unknown;

// What a plugin can use. Calls behind a capability the plugin didn't declare throw.
export interface PluginContext<Config = Record<string, unknown>> {
  readonly pluginId: string;
  readonly serverId: string;
  readonly log: Logger;

  // The admin's config with the defaults of the config schema filled in
  config(): Config;
  // Validated against the config schema of the manifest
  saveConfig(config: Config): Promise<void>;
  serverName(): string | null;

  on<K extends PluginEventName>(event: K, handler: (...args: PluginEvents[K]) => unknown): void;
  // Only commands listed in the manifest
  command(name: string, handler: CommandHandler): void;
  // Handles a manialink action; "pick-{uid}" passes the matched part as params.uid.
  // Returns a function that removes the handler.
  action(name: string, handler: ActionHandler): () => void;
  // Timers are cleared when the plugin unloads; both return a cancel function
  setTimeout(fn: () => void, ms: number): () => void;
  setInterval(fn: () => void, ms: number): () => void;
  sleep(ms: number): Promise<void>;

  readonly live: {
    readonly liveInfo: LiveInfo;
    readonly activePlayers: PlayerInfo[];
    readonly activeMapUid: string | null;
    readonly roundNumber: number;
    findActivePlayer(login: string): PlayerInfo | null;
  };
  readonly players: {
    get(login: string): Promise<PlayerInfo>;
  };

  // Capability "ui"
  readonly ui: {
    widget(options: WidgetOptions): Widget;
    window(options: WindowOptions): Window;
    addButton(button: ActionButton): void;
    removeButton(name: string): void;
  };
  // Capability "chat:send"
  readonly chat: {
    send(message: string): Promise<void>;
    sendTo(login: string, message: string): Promise<void>;
  };
  // Capability "storage": JSON values per server
  readonly storage: {
    get<T = unknown>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    keys(prefix?: string): Promise<string[]>;
  };
  // Capability "records:read"
  readonly records: {
    local(mapUid: string): Promise<LocalRecord | null>;
    forPlayers(mapUid: string, logins: string[]): Promise<LocalRecord[]>;
  };
  // Capability "maps:read"
  readonly maps: {
    findByUid(uid: string): Promise<MapRecord | null>;
    findByFileNames(fileNames: string[]): Promise<MapRecord[]>;
  };
  // Capability "nadeo:read"
  readonly nadeo: {
    worldRecord(mapUid: string): Promise<LeaderboardEntry | null>;
    personalBests(mapUid: string, accountIds: string[]): Promise<Record<string, number>>;
    accountNames(accountIds: string[]): Promise<Record<string, string>>;
  };
  // Capability "notifications"
  notifyAdmins(message: string, description?: string): Promise<void>;
  // Capability "mode:control"
  readonly server: {
    setPaused(paused: boolean): Promise<void>;
    setScriptName(script: string): Promise<void>;
  };
  // Dedicated server calls; which methods are allowed depends on the capabilities
  readonly gbx: {
    call<T = unknown>(method: string, ...params: unknown[]): Promise<T>;
    callScript<T = unknown>(method: string, ...params: unknown[]): Promise<T>;
  };
  // Capability "http:<host>" for every host the plugin talks to
  readonly http: {
    fetch(url: string, request?: HttpRequest): Promise<HttpResponse>;
  };
}

export interface PluginInstance {
  // After create(); show widgets and load state here
  start?(): unknown;
  // Before the plugin unloads
  stop?(): unknown;
  // The admin saved a new config; ctx.config() already returns it
  onConfigUpdate?(): unknown;
}

export interface PluginDefinition<Config = Record<string, unknown>> {
  create(ctx: PluginContext<Config>): PluginInstance | void;
}
