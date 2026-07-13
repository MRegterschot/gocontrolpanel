export type MatchPluginConfig = {
  admins?: string[];
  maps?: string[];
  pickAndBan?: MatchPluginPickAndBan;
  script?: string;
  lobby?: {
    script?: string;
    map?: string;
  };
};

export type MatchPluginPickAndBan = {
  type: "player" | "team";
  order: string;
  teams?: {
    seed: number;
    players: string[];
  }[];
  players?: {
    login: string;
    seed: number;
  }[];
};
