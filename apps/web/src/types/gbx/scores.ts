export interface Scores {
  responseid: string;
  section: string;
  useteams: boolean;
  winnerteam: number;
  winnerplayer: string;
  teams: Team[];
  players: Player[];
}

export interface Team {
  id: number;
  name: string;
  roundpoints: number;
  mappoints: number;
  matchpoints: number;
}

export interface Player {
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

export interface Elimination {
  accountids: string[];
}
