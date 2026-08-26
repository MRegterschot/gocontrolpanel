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
  type?: "player" | "team";
  order: string;
  choosePosition: boolean;
  /** Seconds a player/team has to pick or ban before a random map is chosen for them. 0 or unset disables the timeout. */
  timeout?: number;
  teams?: {
    seed: number;
    name?: string;
    players: string[];
  }[];
  players?: {
    login: string;
    seed: number;
  }[];
};
