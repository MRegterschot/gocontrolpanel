import type {
  ActiveRound,
  DetailedPlayerChat,
  LiveInfo,
  NotificationDto,
  PlayerInfo,
  PlayerManialinkPageAnswer,
  PlayerRound,
  PluginCustomEvent,
  Scores,
  Team,
  Waypoint,
  WaypointEvent,
} from "@gcp/shared";

// Events emitted by one server runtime. Plugins and WS channels subscribe to these.
export type ServerEventMap = {
  connect: [];
  disconnect: [];
  reconnect: [type: "try" | "stop", time: number | null];

  playerConnect: [player: PlayerInfo];
  playerConnectInfo: [liveInfo: LiveInfo];
  playerDisconnect: [login: string];
  playerDisconnectInfo: [round: ActiveRound];
  playerInfo: [player: PlayerInfo];
  playerInfoChanged: [round: ActiveRound];
  playerList: [players: PlayerInfo[]];
  playerChat: [chat: DetailedPlayerChat];
  playerManialinkPageAnswer: [answer: PlayerManialinkPageAnswer];

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
  adminCommand: [notifications: NotificationDto[]];
  // Emitted by a plugin with ctx.emit(); delivered after the emitting call returns
  pluginEvent: [event: PluginCustomEvent];
};

export type ServerEventName = keyof ServerEventMap;

// Cross-server events, consumed by the /servers, /clients and /notifications sockets
export type RegistryEventMap = {
  connect: [serverId: string];
  disconnect: [serverId: string];
  reconnect: [serverId: string, type: "try" | "stop", time: number | null];
  adminCommand: [serverId: string, notifications: NotificationDto[]];
  runtimeAdded: [serverId: string];
  runtimeRemoved: [serverId: string];
};
