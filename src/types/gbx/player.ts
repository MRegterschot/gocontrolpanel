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

export interface SpectatorStatus {
  spectator: boolean;
  temporarySpectator: boolean;
  pureSpectator: boolean;
  autoTarget: boolean;
  currentTargetId: number;
}

export interface PlayerManialinkPageAnswer {
  PlayerUid: number;
  Login: string;
  Answer: string;
  Entries: {
    Name: string;
    Value: string;
  }[];
}