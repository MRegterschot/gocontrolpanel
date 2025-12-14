export interface LiveInfo {
  isWarmUp: boolean;
  warmUpRound?: number;
  warmUpTotalRounds?: number;
  mode: string;
  type: string;
  currentMap: string;
  pointsLimit?: number;
  roundsLimit?: number;
  mapLimit?: number;
  nbWinners?: number;
  pointsRepartition: number[];
  pointsRepartitionMap: Record<number, number[]>;
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
