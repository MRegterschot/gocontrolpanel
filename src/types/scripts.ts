export enum GameModes {
  Cup = "Trackmania/TM_Cup_Online.Script.txt",
  Knockout = "Trackmania/TM_Knockout_Online.Script.txt",
  Laps = "Trackmania/TM_Laps_Online.Script.txt",
  Teams = "Trackmania/TM_Teams_Online.Script.txt",
  TimeAttack = "Trackmania/TM_TimeAttack_Online.Script.txt",
  Rounds = "Trackmania/TM_Rounds_Online.Script.txt",
  RoyalTimeAttack = "Trackmania/TM_RoyalTimeAttack_Online.Script.txt",
  TMWTTeams = "Trackmania/TM_TMWTTeams_Online.Script.txt",
  TMWTMatchmaking = "Trackmania/TM_TMWTMatchmaking_Online.Script.txt",
  TeamsMatchmaking = "Trackmania/TM_Teams_Matchmaking_Online.Script.txt",
  TimeAttackDaily = "Trackmania/TM_TimeAttackDaily_Online.Script.txt",
  KnockoutDaily = "Trackmania/TM_KnockoutDaily_Online.Script.txt",
  COTDQualifications = "Trackmania/TM_COTDQualifications_Online.Script.txt",
  CupClassic = "Trackmania/Legacy/TM_CupClassic_Online.Script.txt",
  ChampionSpring2022 = "Trackmania/Legacy/TM_ChampionSpring2022_Online.Script.txt",
  CupLong = "Trackmania/Legacy/TM_CupLong_Online.Script.txt",
  CupShort = "Trackmania/Legacy/TM_CupShort_Online.Script.txt",
  RoundsBoulet = "Trackmania/Legacy/TM_RoundsBoulet_Online.Script.txt",
  TMWC2023 = "Trackmania/TM_TMWC2023_Online.Script.txt",
  MultiTeams = "Trackmania/Deprecated/TM_MultiTeams_Online.Script.txt",
  HeadToHead = "Trackmania/Deprecated/TM_HeadToHead_Online.Script.txt",
  Final42TMGL = "Trackmania/Deprecated/TM_Final42TMGL_Online.Script.txt",
  Royal = "Trackmania/TM_Royal_Online.Script.txt",
  RoyalStars = "Trackmania/TM_RoyalStars_Online.Script.txt",
  TMWC2025 = "Trackmania/TM_TMWT2025_Online.Script.txt",
  StuntMulti = "Trackmania/TM_StuntMulti_Online.Script.txt",
  Platform = "Trackmania/TM_Platform_Online.Script.txt",
}

export type ScriptSetting = {
  value: Partial<Record<GameModes, string | number | boolean>>;
  type: "string" | "int" | "boolean" | "float";
};

export type GameMode = {
  name: keyof typeof GameModes;
  script: GameModes;
  settings: string[];
};

export type Setting = {
  type: "string" | "int" | "boolean" | "float";
  value?: string | number | boolean;
};

export type GameModeWithSettings = GameMode & {
  scriptSettings: Record<string, Setting>;
};
