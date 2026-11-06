export const GAME_MODE_TYPES = [
  "timeattack",
  "rounds",
  "reversecup",
  "cup",
  "tmwc",
  "tmwt",
  "teams",
  "knockout",
] as const;

export type GameModeType = (typeof GAME_MODE_TYPES)[number];

export interface LiveInfo {
  isWarmUp: boolean;
  warmUpRound?: number;
  warmUpTotalRounds?: number;
  mode: string;
  // Empty string until the first mode detection
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

export interface ActiveRound {
  players: Record<string, PlayerWaypoint>;
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

export function createEmptyLiveInfo(): LiveInfo {
  return {
    maps: [],
    players: {},
    activeRound: { players: {} },
    isWarmUp: false,
    mode: "",
    type: "",
    currentMap: "",
    pointsRepartition: [],
    pointsRepartitionMap: {},
    fastForwardPointsRepartition: false,
    pauseAvailable: false,
    isPaused: false,
  };
}
