export type MatchPluginConfig = {
  admins?: string[];
  maps?: string[];
  pickAndBan?: MatchPluginPickAndBan;
  script?: string;
  lobby?: {
    script?: string;
    map?: string;
  }
};

export type MatchPluginPickAndBan = {
  order: string;
  players: {
    login: string;
    seed: number;
  }[];
};
