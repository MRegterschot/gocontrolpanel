// Payloads as sent by the dedicated server over XML-RPC (field casing is the server's).

export interface SMapInfo {
  UId: string;
  Name: string;
  FileName: string;
  Author: string;
  AuthorNickname: string;
  Environnement: string;
  Mood: string;
  BronzeTime: number;
  SilverTime: number;
  GoldTime: number;
  AuthorTime: number;
  CopperPrice: number;
  LapRace: boolean;
  NbLaps: number;
  NbCheckpoints: number;
  MapType: string;
  MapStyle: string;
}

export interface MapInfoMinimal {
  Name: string;
  UId: string;
  FileName: string;
  Environnement: string;
  Author: string;
  AuthorNickname: string;
  GoldTime: number;
  CopperPrice: number;
  MapType: string;
  MapStyle: string;
}

export interface SPlayerInfo {
  Login: string;
  NickName: string;
  PlayerId: number;
  SpectatorStatus: number;
  TeamId: number;
  LadderRanking: number;
  Flags: number;
}

export interface PlayerChat {
  PlayerUid: number;
  Login: string;
  Text: string;
  IsRegistredCmd: boolean;
  Options: number;
}

export type DetailedPlayerChat = PlayerChat & {
  Name: string;
};

export interface PlayerManialinkPageAnswer {
  PlayerUid: number;
  Login: string;
  Answer: string;
  Entries: {
    Name: string;
    Value: string;
  }[];
}

export interface SpectatorStatus {
  spectator: boolean;
  temporarySpectator: boolean;
  pureSpectator: boolean;
  autoTarget: boolean;
  currentTargetId: number;
}

export interface PlayerStatus {
  spectator: boolean;
  eliminated: boolean;
  lastChance: boolean;
}

// Mode script (JSON) callback payloads

export interface ScriptMap {
  uid: string;
  name: string;
  filename: string;
  author: string;
  authornickname: string;
  environment: string;
  mood: string;
  bronzetime: number;
  silvertime: number;
  goldtime: number;
  authortime: number;
  copperprice: number;
  laprace: boolean;
  nblaps: number;
  maptype: string;
  mapstyle: string;
}

export interface EndMap {
  count: number;
  time: number;
  map: ScriptMap;
}

export interface StartMap {
  count: number;
  restarted: boolean;
  time: number;
  map: ScriptMap;
}

export interface Waypoint {
  time: number;
  login: string;
  accountid: string;
  racetime: number;
  laptime: number;
  stuntsscore: number;
  checkpointinrace: number;
  checkpointinlap: number;
  isendrace: boolean;
  isendlap: boolean;
  curracecheckpoints: number[];
  curlapcheckpoints: number[];
  blockid: string;
  speed: number;
}

export interface WaypointEvent {
  time: number;
  login: string;
  accountid: string;
}

export interface ScoresTeam {
  id: number;
  name: string;
  roundpoints: number;
  mappoints: number;
  matchpoints: number;
}

export interface ScoresPlayer {
  login: string;
  accountid: string;
  name: string;
  team: number;
  rank: number;
  roundpoints: number;
  mappoints: number;
  matchpoints: number;
  bestracetime: number;
  bestracecheckpoints: number[];
  bestlaptime: number;
  bestlapcheckpoints: number[];
  prevracetime: number;
  prevracecheckpoints: number[];
}

export interface Scores {
  responseid: string;
  section: string;
  useteams: boolean;
  winnerteam: number;
  winnerplayer: string;
  teams: ScoresTeam[];
  players: ScoresPlayer[];
}

export interface Elimination {
  accountids: string[];
}

export interface WarmUp {
  current: number;
  total: number;
}

export interface WarmUpStatus {
  responseid: string;
  available: boolean;
  active: boolean;
}

export interface PauseStatus {
  responseid: string;
  available: boolean;
  active: boolean;
}

export interface ScriptName {
  CurrentValue: string;
  NextValue: string;
}

export interface MainServerPlayerInfo {
  Login: string;
  NickName: string;
  PlayerId: number;
}
