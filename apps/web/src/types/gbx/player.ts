export type SPlayerInfo = {
  Login: string;
  NickName: string;
  PlayerId: number;
  SpectatorStatus: number;
  TeamId: number;
  LadderRanking: number;
  Flags: number;
};

export type PlayerChat = {
  PlayerUid: number;
  Login: string;
  Text: string;
  IsRegistredCmd: boolean;
  Options: number;
};

export type DetailedPlayerChat = PlayerChat & {
  Name: string;
};

export type SpectatorStatus = {
  spectator: boolean;
  temporarySpectator: boolean;
  pureSpectator: boolean;
  autoTarget: boolean;
  currentTargetId: number;
};

export type PlayerStatus = {
  spectator: boolean;
  eliminated: boolean;
  lastChance: boolean;
};

export type PlayerManialinkPageAnswer = {
  PlayerUid: number;
  Login: string;
  Answer: string;
  Entries: {
    Name: string;
    Value: string;
  }[];
};
