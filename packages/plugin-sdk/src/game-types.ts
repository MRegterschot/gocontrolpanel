// Payloads of the events and live state a plugin sees. A copy of the service's own types, so the
// SDK has no private dependencies; the GBX service tests that the two stay compatible.

export type GameModeType =
  | "timeattack"
  | "rounds"
  | "reversecup"
  | "cup"
  | "tmwc"
  | "tmwt"
  | "teams"
  | "knockout";

export interface PlayerInfo {
  login: string;
  nickName: string;
  playerId: number;
  spectatorStatus: number;
  teamId: number;
}

export interface Team {
  id: number;
  name: string;
  roundPoints: number;
  mapPoints: number;
  matchPoints: number;
}

export interface PlayerRound {
  login: string;
  accountId: string;
  name: string;
  team: number;
  rank: number;
  finalist: boolean;
  lastChance: boolean;
  winner: boolean;
  eliminated: boolean;
  roundPoints: number;
  matchPoints: number;
  bestTime: number;
  bestCheckpoints: number[];
  prevTime: number;
  prevCheckpoints: number[];
  connected: boolean;
}

export interface PlayerWaypoint {
  login: string;
  accountId: string;
  time: number;
  hasFinished: boolean;
  hasGivenUp: boolean;
  isFinalist: boolean;
  isLastChance: boolean;
  isEliminated: boolean;
  checkpoint: number;
}

export interface ActiveRound {
  players: Record<string, PlayerWaypoint>;
}

export interface LiveInfo {
  isWarmUp: boolean;
  warmUpRound?: number;
  warmUpTotalRounds?: number;
  mode: string;
  // Empty until the mode is known
  type: GameModeType | "";
  currentMap: string;
  pointsLimit?: number;
  roundsLimit?: number;
  mapLimit?: number;
  nbWinners?: number;
  pointsRepartition: number[];
  pointsRepartitionMap: Record<number, number[]>;
  fastForwardPointsRepartition: boolean;
  pauseAvailable: boolean;
  isPaused: boolean;
  maps: string[];
  teams?: Record<number, Team>;
  players: Record<string, PlayerRound>;
  activeRound: ActiveRound;
}

export interface DetailedPlayerChat {
  PlayerUid: number;
  Login: string;
  Text: string;
  IsRegistredCmd: boolean;
  Options: number;
  Name: string;
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

// Dedicated server payloads, as returned by ctx.gbx.call (field casing is the server's)

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

export interface MainServerPlayerInfo {
  Login: string;
  NickName: string;
  PlayerId: number;
}

export interface SpectatorStatus {
  spectator: boolean;
  temporarySpectator: boolean;
  pureSpectator: boolean;
  autoTarget: boolean;
  currentTargetId: number;
}

// A player's state in reverse cup
export interface PlayerStatus {
  spectator: boolean;
  eliminated: boolean;
  lastChance: boolean;
}
