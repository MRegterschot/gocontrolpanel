export type MatchPluginConfig = {
  admins?: string[];
  maps?: string[];
  pickAndBan?: MatchPluginPickAndBan;
  script?: string;
  matchSettings?: string;
};

export type MatchPluginPickAndBan = {
  order: string;
  players: {
    login: string;
    seed: number;
  }[];
};