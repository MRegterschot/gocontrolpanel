import {
  GameMode,
  GameModes,
  GameModeWithSettings,
  ScriptSetting,
  Setting,
} from "@/types/scripts";

const gameModesScripts = [
  "Trackmania/TM_Cup_Online.Script.txt",
  "Trackmania/TM_Laps_Online.Script.txt",
  "Trackmania/TM_Rounds_Online.Script.txt",
  "Trackmania/TM_Teams_Online.Script.txt",
  "Trackmania/TM_Royal_Online.Script.txt",
  "Trackmania/TM_Knockout_Online.Script.txt",
  "Trackmania/TM_Platform_Online.Script.txt",
  "Trackmania/TM_TMWC2023_Online.Script.txt",
  "Trackmania/TM_TMWT2025_Online.Script.txt",
  "Trackmania/TM_TMWTTeams_Online.Script.txt",
  "Trackmania/TM_TimeAttack_Online.Script.txt",
  "Trackmania/TM_StuntMulti_Online.Script.txt",
  "Trackmania/TM_RoyalStars_Online.Script.txt",
  "Trackmania/TM_KnockoutDaily_Online.Script.txt",
  "Trackmania/Legacy/TM_CupLong_Online.Script.txt",
  "Trackmania/TM_RoyalTimeAttack_Online.Script.txt",
  "Trackmania/TM_TMWTMatchmaking_Online.Script.txt",
  "Trackmania/TM_TimeAttackDaily_Online.Script.txt",
  "Trackmania/Legacy/TM_CupShort_Online.Script.txt",
  "Trackmania/TM_Teams_Matchmaking_Online.Script.txt",
  "Trackmania/Legacy/TM_CupClassic_Online.Script.txt",
  "Trackmania/TM_COTDQualifications_Online.Script.txt",
  "Trackmania/Deprecated/TM_Champion_Online.Script.txt",
  "Trackmania/Legacy/TM_RoundsBoulet_Online.Script.txt",
  "Trackmania/Deprecated/TM_MultiTeams_Online.Script.txt",
  "Trackmania/Deprecated/TM_HeadToHead_Online.Script.txt",
  "Trackmania/Deprecated/TM_Final42TMGL_Online.Script.txt",
  "Trackmania/Legacy/TM_ChampionSpring2022_Online.Script.txt",
];

const settings: {
  [key: string]: ScriptSetting;
} = {
  S_AddBotsUntil: {
    value: {
      [GameModes.Royal]: 20,
    },
    type: "int",
  },
  S_AlwaysDisplayUnlockTimer: {
    value: {
      [GameModes.Royal]: false,
    },
    type: "boolean",
  },
  S_ApiAuthorizationHeader: {
    value: {},
    type: "string",
  },
  S_ApiCompetitionUid: {
    value: {},
    type: "string",
  },
  S_ApiStageUid: {
    value: {
      [GameModes.TMWC2023]: "b2673f00-3eb6-48d9-8425-9d08d2786efe",
    },
    type: "string",
  },
  S_ApiTourUid: {
    value: {
      [GameModes.TMWC2023]: "c6b4ac73-e296-46f0-8fce-b65075b3bb02",
    },
    type: "string",
  },
  S_ApiUrl: {
    value: {},
    type: "string",
  },
  S_BalanceScore: {
    value: {
      [GameModes.TeamsMatchmaking]: true,
    },
    type: "boolean",
  },
  S_BasicAuthHeader: {
    value: {
      [GameModes.TimeAttackDaily]: "Basic xxx",
      [GameModes.TMWC2023]: "Basic xxx",
    },
    type: "string",
  },
  S_BestLapBonusPoints: {
    value: {},
    type: "int",
  },
  S_Bots_Clan: {
    value: {
      [GameModes.TeamsMatchmaking]: 2,
    },
    type: "int",
  },
  S_Bots_EnablePlaying: {
    value: {
      [GameModes.TeamsMatchmaking]: false,
    },
    type: "boolean",
  },
  S_Bots_EnableRecording: {
    value: {
      [GameModes.TeamsMatchmaking]: false,
    },
    type: "boolean",
  },
  S_Bots_GhostDBId: {
    value: {
      [GameModes.TeamsMatchmaking]: 0,
    },
    type: "int",
  },
  S_Bots_GhostsPerBot: {
    value: {
      [GameModes.TeamsMatchmaking]: 10,
    },
    type: "int",
  },
  S_Bots_LevelRange: {
    value: {
      [GameModes.TeamsMatchmaking]: 10,
    },
    type: "int",
  },
  S_Bots_LevelShift: {
    value: {
      [GameModes.TeamsMatchmaking]: 2,
    },
    type: "int",
  },
  S_Bots_PBMultiplier: {
    value: {
      [GameModes.TeamsMatchmaking]: 1.1,
    },
    type: "float",
  },
  S_ChatTime: {
    value: {
      [GameModes.Knockout]: 6,
      [GameModes.TMWTTeams]: 6,
      [GameModes.TMWTMatchmaking]: 6,
      [GameModes.TeamsMatchmaking]: 6,
      [GameModes.HeadToHead]: 6,
      [GameModes.Royal]: 6,
      [GameModes.TMWC2023]: 6,
      [GameModes.ChampionSpring2022]: 6,
    },
    type: "int",
  },
  S_ClubId: {
    value: {
      [GameModes.TMWC2023]: 0,
    },
    type: "int",
  },
  S_ClubName: {
    value: {
      [GameModes.TMWC2023]: "",
    },
    type: "string",
  },
  S_CompetitionName: {
    value: {
      [GameModes.ChampionSpring2022]: "",
    },
    type: "string",
  },
  S_CrashDetectionThreshold: {
    value: {
      [GameModes.TMWC2023]: 2000,
    },
    type: "int",
  },
  S_CumulatePoints: {
    value: {
      [GameModes.Teams]: false,
      [GameModes.TeamsMatchmaking]: false,
    },
    type: "boolean",
  },
  S_CupPointsLimit: {
    value: {
      [GameModes.CupClassic]: 120,
      [GameModes.ChampionSpring2022]: 1,
    },
    type: "int",
  },
  S_DecoImageUrl_Checkpoint: {
    value: {
      [GameModes.TMWTMatchmaking]:
        "file://Media/Manialinks/Nadeo/TMNext/Modes/Matchmaking/Decal_Matchmaking.dds",
      [GameModes.TeamsMatchmaking]:
        "file://Media/Manialinks/Nadeo/TMNext/Modes/Matchmaking/Decal_Matchmaking.dds",
      [GameModes.TMWC2023]: "",
    },
    type: "string",
  },
  S_DecoImageUrl_DecalSponsor4x1: {
    value: {
      [GameModes.TMWC2023]: "",
    },
    type: "string",
  },
  S_DecoImageUrl_Screen16x1: {
    value: {
      [GameModes.ChampionSpring2022]:
        "file://Media/Manialinks/Nadeo/TMNext/Modes/Champion/Stadium/Screen16x1.dds",
      [GameModes.TMWC2023]: "",
    },
    type: "string",
  },
  S_DecoImageUrl_Screen16x9: {
    value: {
      [GameModes.TMWC2023]: "",
      [GameModes.ChampionSpring2022]:
        "file://Media/Manialinks/Nadeo/TMNext/Modes/Champion/Sponsors/Default.dds",
    },
    type: "string",
  },
  S_DecoImageUrl_Screen8x1: {
    value: {
      [GameModes.TMWC2023]: "",
      [GameModes.ChampionSpring2022]:
        "file://Media/Manialinks/Nadeo/TMNext/Modes/Champion/Stadium/Screen8x1.dds",
    },
    type: "string",
  },
  S_DecoImageUrl_WhoAmIUrl: {
    value: { [GameModes.TMWC2023]: "/api/club/room/:ServerLogin/whoami" },
    type: "string",
  },
  S_DelayBeforeNextMap: {
    value: {
      [GameModes.TMWC2023]: 2000,
    },
    type: "int",
  },
  S_DisableGiveUp: {
    value: {
      [GameModes.Laps]: false,
    },
    type: "boolean",
  },
  S_DisableGoToMap: {
    value: {
      [GameModes.TMWC2023]: false,
    },
    type: "boolean",
  },
  S_DisableMatchIntro: {
    value: {},
    type: "boolean",
  },
  S_Division: {
    value: {
      [GameModes.Royal]: "",
    },
    type: "string",
  },
  S_EarlyEndMatchCallback: {
    value: {
      [GameModes.TMWTTeams]: true,
      [GameModes.TMWTMatchmaking]: true,
      [GameModes.TeamsMatchmaking]: true,
      [GameModes.TMWC2023]: true,
      [GameModes.ChampionSpring2022]: true,
    },
    type: "boolean",
  },
  S_EliminatedPlayersNbRanks: {
    value: {
      [GameModes.Knockout]: "4,16,16",
    },
    type: "string",
  },
  S_EnableAmbientSound: {
    value: {
      [GameModes.ChampionSpring2022]: true,
    },
    type: "boolean",
  },
  S_EnableDossardColor: {
    value: {
      [GameModes.TMWTTeams]: true,
      [GameModes.TMWC2023]: true,
      [GameModes.TMWC2025]: true,
    },
    type: "boolean",
  },
  S_EnableGhostsUpload: {
    value: {
      [GameModes.Royal]: false,
    },
    type: "boolean",
  },
  S_EnableJoinLeaveNotifications: {
    value: {
      [GameModes.Royal]: false,
      [GameModes.TMWC2023]: true,
    },
    type: "boolean",
  },
  S_EnablePreMatch: {
    value: {
      [GameModes.ChampionSpring2022]: false,
    },
    type: "boolean",
  },
  S_EnableTrophiesGain: {
    value: {
      [GameModes.ChampionSpring2022]: false,
    },
    type: "boolean",
  },
  S_EnableWinScreen: {
    value: {
      [GameModes.HeadToHead]: false,
      [GameModes.ChampionSpring2022]: false,
    },
    type: "boolean",
  },
  S_EndRoundPostScoreUpdateDuration: {
    value: {
      [GameModes.ChampionSpring2022]: 3,
    },
    type: "int",
  },
  S_EndRoundPreScoreUpdateDuration: {
    value: {
      [GameModes.ChampionSpring2022]: 3,
    },
    type: "int",
  },
  S_FinalistsAccountIds: {
    value: {},
    type: "string",
  },
  S_FinishTimeout: {
    value: {
      [GameModes.Rounds]: -1,
      [GameModes.Laps]: -1,
      [GameModes.Knockout]: 5,
      [GameModes.Cup]: -1,
      [GameModes.Teams]: -1,
      [GameModes.TMWTTeams]: -1,
      [GameModes.TMWTMatchmaking]: -1,
      [GameModes.TeamsMatchmaking]: -1,
      [GameModes.MultiTeams]: -1,
      [GameModes.HeadToHead]: 10,
      [GameModes.CupClassic]: 15,
      [GameModes.TMWC2023]: -1,
      [GameModes.TMWC2025]: -1,
      [GameModes.ChampionSpring2022]: -1,
    },
    type: "int",
  },
  S_FinishTimeoutDivider: {
    value: {
      [GameModes.TeamsMatchmaking]: 3,
    },
    type: "int",
  },
  S_ForceLapsNb: {
    value: {
      [GameModes.TimeAttack]: -1,
      [GameModes.Laps]: -1,
      [GameModes.TimeAttackDaily]: 0,
      [GameModes.HeadToHead]: 2,
      [GameModes.TMWC2023]: -1,
    },
    type: "int",
  },
  S_ForceRoadSpectatorsNb: {
    value: {
      [GameModes.TMWTTeams]: -1,
      [GameModes.TMWC2023]: -1,
      [GameModes.ChampionSpring2022]: -1,
    },
    type: "int",
  },
  S_ForceWinnersNb: {
    value: {},
    type: "int",
  },
  S_GhostDBId: {
    value: {
      [GameModes.Royal]: 0,
    },
    type: "int",
  },
  S_HeaderLogoUrl: {
    value: {
      [GameModes.TMWC2025]: "",
    },
    type: "string",
  },
  S_HideScoresHeader: {
    value: {
      [GameModes.ChampionSpring2022]: false,
    },
    type: "boolean",
  },
  S_InfiniteLaps: {
    value: {
      [GameModes.Laps]: false,
      [GameModes.TMWC2023]: false,
    },
    type: "boolean",
  },
  S_IntroBackgroundUrl: {
    value: {
      [GameModes.TMWC2025]: "",
    },
    type: "string",
  },
  S_IntroLogoUrl: {
    value: {
      [GameModes.TMWC2025]: "",
    },
    type: "string",
  },
  S_IntroMaxDuration: {
    value: {
      [GameModes.TimeAttackDaily]: 15,
    },
    type: "int",
  },
  S_IsChannelServer: {
    value: {
      [GameModes.TMWC2023]: false,
    },
    type: "boolean",
  },
  S_IsMatchmaking: {
    value: {
      [GameModes.TMWTTeams]: false,
      [GameModes.Royal]: false,
      [GameModes.TMWC2023]: false,
    },
    type: "boolean",
  },
  S_IsSplitScreen: {
    value: {
      [GameModes.TMWC2023]: false,
    },
    type: "boolean",
  },
  S_IsSuperRoyal: {
    value: {
      [GameModes.Royal]: false,
    },
    type: "boolean",
  },
  S_IsSuperRoyalFinale: {
    value: {
      [GameModes.Royal]: false,
    },
    type: "boolean",
  },
  S_KOCheckpointNb: {
    value: {
      [GameModes.ChampionSpring2022]: 3,
    },
    type: "int",
  },
  S_KOCheckpointTime: {
    value: {
      [GameModes.ChampionSpring2022]: 1000,
    },
    type: "int",
  },
  S_KOValidationDelay: {
    value: {
      [GameModes.ChampionSpring2022]: 1000,
    },
    type: "int",
  },
  S_LoadMatchState: {
    value: {
      [GameModes.ChampionSpring2022]: "",
    },
    type: "string",
  },
  S_LoadingScreenImageUrl: {
    value: {
      [GameModes.TMWC2023]: "",
      [GameModes.TMWC2025]: "",
    },
    type: "string",
  },
  S_LogLevel: {
    value: {
      [GameModes.TimeAttackDaily]: 3,
    },
    type: "int",
  },
  S_MapPointsLimit: {
    value: {
      [GameModes.TMWTTeams]: 10,
      [GameModes.TMWTMatchmaking]: 10,
      [GameModes.HeadToHead]: 3,
      [GameModes.TMWC2023]: 10,
      [GameModes.TMWC2025]: 10,
    },
    type: "int",
  },
  S_MapWorldRecord: {
    value: {
      [GameModes.ChampionSpring2022]: "",
    },
    type: "string",
  },
  S_MapsPerMatch: {
    value: {
      [GameModes.Rounds]: -1,
      [GameModes.Teams]: -1,
      [GameModes.TeamsMatchmaking]: -1,
      [GameModes.MultiTeams]: -1,
    },
    type: "int",
  },
  S_MatchId: {
    value: {
      [GameModes.TMWTMatchmaking]: "",
      [GameModes.TeamsMatchmaking]: "",
      [GameModes.Royal]: "",
    },
    type: "string",
  },
  S_MatchInfo: {
    value: {
      [GameModes.TMWTTeams]: "Trackmania Grand League",
      [GameModes.TMWC2023]: "Trackmania World Championship 2023",
      [GameModes.TMWC2025]: "",
    },
    type: "string",
  },
  S_MatchLevel: {
    value: {
      [GameModes.ChampionSpring2022]: 0,
    },
    type: "int",
  },
  S_MatchPointsLimit: {
    value: {
      [GameModes.TMWTTeams]: 4,
      [GameModes.TMWTMatchmaking]: 1,
      [GameModes.HeadToHead]: 3,
      [GameModes.TMWC2023]: 5,
      [GameModes.TMWC2025]: 3,
      [GameModes.ChampionSpring2022]: 1,
    },
    type: "int",
  },
  S_MatchPosition: {
    value: {},
    type: "int",
  },
  S_MatchStyle: {
    value: {
      [GameModes.ChampionSpring2022]: 0,
    },
    type: "int",
  },
  S_MatchType: {
    value: {
      [GameModes.ChampionSpring2022]: 0,
    },
    type: "int",
  },
  S_MatchWaitingScreenDuration: {
    value: {
      [GameModes.Royal]: 20,
    },
    type: "int",
  },
  S_MatchmakingId: {
    value: {
      [GameModes.TMWTMatchmaking]: "",
      [GameModes.TeamsMatchmaking]: "",
    },
    type: "string",
  },
  S_MaxBotLevel: {
    value: {
      [GameModes.Royal]: 0,
    },
    type: "int",
  },
  S_MaxBotsTeams: {
    value: {
      [GameModes.Royal]: 10,
    },
    type: "int",
  },
  S_MaxPointsPerRound: {
    value: {
      [GameModes.Teams]: 6,
      [GameModes.TeamsMatchmaking]: 6,
    },
    type: "int",
  },
  S_MinBotLevel: {
    value: {
      [GameModes.Royal]: 0,
    },
    type: "int",
  },
  S_NbOfWinners: {
    value: {
      [GameModes.Cup]: 3,
      [GameModes.HeadToHead]: 1,
      [GameModes.CupClassic]: 2,
      [GameModes.ChampionSpring2022]: 1,
    },
    type: "int",
  },
  S_NeutralEmblemUrl: {
    value: {
      [GameModes.TMWC2023]: "",
    },
    type: "string",
  },
  S_NoRoundTie: {
    value: {
      [GameModes.TeamsMatchmaking]: true,
    },
    type: "boolean",
  },
  S_OverridePlayerProfiles: {
    value: {
      [GameModes.ChampionSpring2022]: "",
    },
    type: "string",
  },
  S_PauseBeforeRoundNb: {
    value: {},
    type: "int",
  },
  S_PauseDuration: {
    value: {},
    type: "int",
  },
  S_PickAndBan_Enable: {
    value: {
      [GameModes.TMWTTeams]: true,
      [GameModes.TMWC2023]: true,
      [GameModes.TMWC2025]: true,
    },
    type: "boolean",
  },
  S_PickAndBan_Style: {
    value: {
      [GameModes.TMWTTeams]:
        '{"Background": "file://Media/Manialinks/Nadeo/TMNext/Modes/TMWT/UI/TMWT_MatchIntroBackground.dds","TopLeftLogo": "file://Media/Manialinks/Nadeo/TMNext/Modes/TMWT/BrandsLogo/TMWT_Logo.dds","TopRightLogo": "file://Media/Manialinks/Nadeo/TMNext/Modes/TMWT/BrandsLogo/TMWT_TMGL.dds","BottomLogo": "file://Media/Manialinks/Nadeo/TMNext/Modes/TMWT/BrandsLogo/TMWT_Kaporal.dds"}',
      [GameModes.TMWC2023]:
        '{\"Background\": \"file://Media/Manialinks/Nadeo/TMNext/Modes/TMWT/UI/TMWT_MatchIntroBackground.dds\", \"TopLeftLogo\": \"file://Media/Manialinks/Nadeo/TMNext/Modes/TMWT/BrandsLogo/TMWT_Logo.dds\", \"TopRightLogo\": \"file://Media/Manialinks/Nadeo/TMNext/Modes/TMWT/BrandsLogo/TMWT_TMGL.dds\", \"BottomLogo\": \"file://Media/Manialinks/Nadeo/TMNext/Modes/TMWT/BrandsLogo/TMWT_Kaporal.dds\" }',
      [GameModes.TMWC2025]:
        '{ "Background": "", "TopLeftLogo": "", "TopRightLogo": "", "BottomLogo": "" }',
    },
    type: "string",
  },
  S_PlayerPartition: {
    value: {
      [GameModes.TimeAttackDaily]: "",
    },
    type: "string",
  },
  S_PointsGap: {
    value: {
      [GameModes.Teams]: 1,
      [GameModes.TeamsMatchmaking]: 1,
    },
    type: "int",
  },
  S_PointsLimit: {
    value: {
      [GameModes.Rounds]: 50,
      [GameModes.Cup]: 100,
      [GameModes.Teams]: 100,
      [GameModes.TeamsMatchmaking]: 5,
      [GameModes.MultiTeams]: 50,
    },
    type: "int",
  },
  S_PointsRepartition: {
    value: {
      [GameModes.Rounds]: "",
      [GameModes.Knockout]: "",
      [GameModes.Cup]: "",
      [GameModes.Teams]: "",
      [GameModes.TeamsMatchmaking]: "6, 5, 4, 3, 2, 1",
      [GameModes.CupClassic]: "10,6,4,3,2,1",
      [GameModes.TMWC2023]: "",
      [GameModes.ChampionSpring2022]: "1",
    },
    type: "string",
  },
  S_PointsRepartition1VS: {
    value: {
      [GameModes.TeamsMatchmaking]: "2, 1",
    },
    type: "string",
  },
  S_PointsRepartition2VS: {
    value: {
      [GameModes.TeamsMatchmaking]: "4, 3, 2, 1",
    },
    type: "string",
  },
  S_QualificationsEndTime_MinMargin: {
    value: {
      [GameModes.TimeAttackDaily]: 30000,
    },
    type: "int",
  },
  S_RankedCompetitionType: {
    value: {
      [GameModes.TimeAttackDaily]: "",
    },
    type: "string",
  },
  S_RespawnBehaviour: {
    value: {
      [GameModes.TMWC2023]: 0,
    },
    type: "int",
  },
  S_RoundWaitingScreenDuration: {
    value: {
      [GameModes.Royal]: 20,
    },
    type: "int",
  },
  S_RoundsLimit: {
    value: {},
    type: "int",
  },
  S_RoundsPerMap: {
    value: {
      [GameModes.Rounds]: -1,
      [GameModes.Knockout]: -1,
      [GameModes.Cup]: 5,
      [GameModes.Teams]: -1,
      [GameModes.TeamsMatchmaking]: -1,
      [GameModes.MultiTeams]: -1,
      [GameModes.CupClassic]: 4,
      [GameModes.ChampionSpring2022]: -1,
    },
    type: "int",
  },
  S_RoundsWithAPhaseChange: {
    value: {},
    type: "string",
  },
  S_RoundsWithoutElimination: {
    value: {
      [GameModes.Knockout]: 1,
    },
    type: "int",
  },
  S_ScriptEnvironment: {
    value: {
      [GameModes.TeamsMatchmaking]: "development",
      [GameModes.TimeAttackDaily]: "production",
      [GameModes.TMWC2023]: "production",
    },
    type: "string",
  },
  S_SeasonIds: {
    value: {
      [GameModes.TMWC2023]: "",
    },
    type: "string",
  },
  S_SegmentBonusTime: {
    value: {
      [GameModes.Royal]: 1,
    },
    type: "int",
  },
  S_SegmentUnlockInterval: {
    value: {
      [GameModes.Royal]: 30,
    },
    type: "int",
  },
  S_Sign16x9DefaultUrl: {
    value: {
      [GameModes.TMWC2025]: "",
    },
    type: "string",
  },
  S_Sign2x3DefaultUrl: {
    value: {
      [GameModes.TMWC2025]:
        "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWT/Sign2x3/Default.dds",
    },
    type: "string",
  },
  S_Sign64x10DefaultUrl: {
    value: {
      [GameModes.TMWC2025]:
        "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWT/Sign64x10/Default.dds",
    },
    type: "string",
  },
  S_SponsorsUrl: {
    value: {
      [GameModes.TMWTTeams]:
        "file://Media/Manialinks/Nadeo/TMNext/Modes/TMWT/UI/KAPORAL_512x80.dds",
      [GameModes.TMWC2023]: "",
      [GameModes.TMWC2025]: "",
      [GameModes.ChampionSpring2022]: "",
    },
    type: "string",
  },
  S_StepNb: {
    value: {
      [GameModes.ChampionSpring2022]: 0,
    },
    type: "int",
  },
  S_StopMatchIfNotEnoughPlayers: {
    value: {
      [GameModes.ChampionSpring2022]: true,
    },
    type: "boolean",
  },
  S_SuperRoyalRoundNumber: {
    value: {
      [GameModes.Royal]: 0,
    },
    type: "int",
  },
  S_SynchronizePlayersAtMapStart: {
    value: {
      [GameModes.TMWC2023]: true,
    },
    type: "boolean",
  },
  S_SynchronizePlayersAtRoundStart: {
    value: {
      [GameModes.TeamsMatchmaking]: true,
      [GameModes.TMWC2023]: true,
    },
    type: "boolean",
  },
  S_TeamsNb: {
    value: {
      [GameModes.MultiTeams]: 10,
    },
    type: "int",
  },
  S_TeamsUrl: {
    value: {
      [GameModes.TMWTTeams]: "",
      [GameModes.TMWTMatchmaking]: "",
      [GameModes.TMWC2023]: "",
      [GameModes.TMWC2025]: "",
    },
    type: "string",
  },
  S_TimeLimit: {
    value: {
      [GameModes.TimeAttack]: 300,
      [GameModes.Laps]: 0,
      [GameModes.RoyalTimeAttack]: 150,
      [GameModes.TimeAttackDaily]: 900,
      [GameModes.Royal]: 150,
    },
    type: "int",
  },
  S_TimeOutPlayersNumber: {
    value: {},
    type: "int",
  },
  S_TrackNb: {
    value: {
      [GameModes.ChampionSpring2022]: 0,
    },
    type: "int",
  },
  S_TracksTotal: {
    value: {
      [GameModes.ChampionSpring2022]: 0,
    },
    type: "int",
  },
  S_TrustClientSimu: {
    value: {
      [GameModes.TMWC2023]: true,
    },
    type: "boolean",
  },
  S_UseAlternateRules: {
    value: {
      [GameModes.Teams]: true,
      [GameModes.TeamsMatchmaking]: false,
    },
    type: "boolean",
  },
  S_UseClublinks: {
    value: {
      [GameModes.TMWC2023]: false,
    },
    type: "boolean",
  },
  S_UseClublinksSponsors: {
    value: {
      [GameModes.TMWC2023]: false,
    },
    type: "boolean",
  },
  S_UseCrudeExtrapolation: {
    value: {
      [GameModes.TMWC2023]: true,
    },
    type: "boolean",
  },
  S_UseCustomPointsRepartition: {
    value: {
      [GameModes.Teams]: false,
      [GameModes.TeamsMatchmaking]: true,
    },
    type: "boolean",
  },
  S_UseTieBreak: {
    value: {
      [GameModes.Rounds]: true,
      [GameModes.TeamsMatchmaking]: true,
      [GameModes.MultiTeams]: true,
    },
    type: "boolean",
  },
  S_WarmUpDuration: {
    value: {
      [GameModes.TimeAttack]: 0,
      [GameModes.Rounds]: 0,
      [GameModes.Laps]: 0,
      [GameModes.Knockout]: 0,
      [GameModes.Cup]: 0,
      [GameModes.Teams]: 0,
      [GameModes.TMWTTeams]: 20,
      [GameModes.TMWTMatchmaking]: 0,
      [GameModes.TeamsMatchmaking]: 0,
      [GameModes.TimeAttackDaily]: 0,
      [GameModes.MultiTeams]: 0,
      [GameModes.HeadToHead]: 10,
      [GameModes.TMWC2023]: 20,
      [GameModes.TMWC2025]: 20,
      [GameModes.ChampionSpring2022]: 0,
    },
    type: "int",
  },
  S_WarmUpNb: {
    value: {
      [GameModes.TimeAttack]: 0,
      [GameModes.Rounds]: 0,
      [GameModes.Laps]: 0,
      [GameModes.Knockout]: 0,
      [GameModes.Cup]: 0,
      [GameModes.Teams]: 0,
      [GameModes.TMWTTeams]: 1,
      [GameModes.TMWTMatchmaking]: 0,
      [GameModes.TeamsMatchmaking]: 0,
      [GameModes.TimeAttackDaily]: 0,
      [GameModes.MultiTeams]: 0,
      [GameModes.HeadToHead]: 1,
      [GameModes.TMWC2023]: 1,
      [GameModes.TMWC2025]: 1,
      [GameModes.ChampionSpring2022]: 0,
    },
    type: "int",
  },
  S_WarmUpTimeout: {
    value: {
      [GameModes.TimeAttack]: -1,
      [GameModes.Rounds]: -1,
      [GameModes.Laps]: -1,
      [GameModes.Knockout]: -1,
      [GameModes.Cup]: -1,
      [GameModes.Teams]: -1,
      [GameModes.TMWTTeams]: -1,
      [GameModes.TMWTMatchmaking]: -1,
      [GameModes.TeamsMatchmaking]: -1,
      [GameModes.TimeAttackDaily]: -1,
      [GameModes.MultiTeams]: -1,
      [GameModes.TMWC2023]: -1,
      [GameModes.TMWC2025]: -1,
      [GameModes.ChampionSpring2022]: -1,
    },
    type: "int",
  },
  S_WinnersRatio: {
    value: {},
    type: "float",
  },
  S_WorldRecords: {
    value: {},
    type: "string",
  },
};

const universalSettings = [
  "S_RespawnBehaviour",
  "S_ForceLapsNb",
  "S_InfiniteLaps",
  "S_EnableJoinLeaveNotifications",
  "S_SeasonIds",
  "S_IsSplitScreen",
  "S_DecoImageUrl_WhoAmIUrl",
  "S_DecoImageUrl_Checkpoint",
  "S_DecoImageUrl_DecalSponsor4x1",
  "S_DecoImageUrl_Screen16x9",
  "S_DecoImageUrl_Screen8x1",
  "S_DecoImageUrl_Screen16x1",
  "S_ClubId",
  "S_ClubName",
  "S_LoadingScreenImageUrl",
  "S_TrustClientSimu",
  "S_UseCrudeExtrapolation",
  "S_SynchronizePlayersAtMapStart",
  "S_DisableGoToMap",
  "S_PickAndBan_Enable",
  "S_PickAndBan_Style",
];

const CupMode: GameMode = {
  name: "Cup",
  script: GameModes.Cup,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_DelayBeforeNextMap",
    "S_FinishTimeout",
    "S_IsChannelServer",
    "S_NbOfWinners",
    "S_NeutralEmblemUrl",
    "S_PointsLimit",
    "S_PointsRepartition",
    "S_RespawnBehaviour",
    "S_RoundsPerMap",
    "S_ScriptEnvironment",
    "S_SynchronizePlayersAtRoundStart",
    "S_UseClublinks",
    "S_UseClublinksSponsors",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const KnockoutMode: GameMode = {
  name: "Knockout",
  script: GameModes.Knockout,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_DelayBeforeNextMap",
    "S_EarlyEndMatchCallback",
    "S_EliminatedPlayersNbRanks",
    "S_FinishTimeout",
    "S_IsChannelServer",
    "S_MatchPosition",
    "S_NeutralEmblemUrl",
    "S_PointsRepartition",
    "S_RespawnBehaviour",
    "S_RoundsPerMap",
    "S_RoundsWithoutElimination",
    "S_ScriptEnvironment",
    "S_SynchronizePlayersAtRoundStart",
    "S_UseClublinks",
    "S_UseClublinksSponsors",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const LapsMode: GameMode = {
  name: "Laps",
  script: GameModes.Laps,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_DelayBeforeNextMap",
    "S_DisableGiveUp",
    "S_FinishTimeout",
    "S_IsChannelServer",
    "S_NeutralEmblemUrl",
    "S_RespawnBehaviour",
    "S_ScriptEnvironment",
    "S_SynchronizePlayersAtRoundStart",
    "S_TimeLimit",
    "S_UseClublinks",
    "S_UseClublinksSponsors",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const TeamsMode: GameMode = {
  name: "Teams",
  script: GameModes.Teams,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_CumulatePoints",
    "S_DelayBeforeNextMap",
    "S_FinishTimeout",
    "S_IsChannelServer",
    "S_MapsPerMatch",
    "S_MaxPointsPerRound",
    "S_PointsGap",
    "S_PointsLimit",
    "S_PointsRepartition",
    "S_RoundsPerMap",
    "S_NeutralEmblemUrl",
    "S_RespawnBehaviour",
    "S_ScriptEnvironment",
    "S_SynchronizePlayersAtRoundStart",
    "S_UseAlternateRules",
    "S_UseCustomPointsRepartition",
    "S_UseTieBreak",
    "S_UseClublinks",
    "S_UseClublinksSponsors",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const TimeAttackMode: GameMode = {
  name: "TimeAttack",
  script: GameModes.TimeAttack,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_DelayBeforeNextMap",
    "S_IsChannelServer",
    "S_TimeLimit",
    "S_NeutralEmblemUrl",
    "S_RespawnBehaviour",
    "S_ScriptEnvironment",
    "S_SynchronizePlayersAtRoundStart",
    "S_UseClublinks",
    "S_UseClublinksSponsors",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const RoundsMode: GameMode = {
  name: "Rounds",
  script: GameModes.Rounds,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_DelayBeforeNextMap",
    "S_FinishTimeout",
    "S_MapsPerMatch",
    "S_PointsLimit",
    "S_PointsRepartition",
    "S_RoundsPerMap",
    "S_IsChannelServer",
    "S_NeutralEmblemUrl",
    "S_RespawnBehaviour",
    "S_ScriptEnvironment",
    "S_SynchronizePlayersAtRoundStart",
    "S_UseClublinks",
    "S_UseClublinksSponsors",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const RoyalTimeAttackMode: GameMode = {
  name: "RoyalTimeAttack",
  script: GameModes.RoyalTimeAttack,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_DelayBeforeNextMap",
    "S_IsChannelServer",
    "S_NeutralEmblemUrl",
    "S_RespawnBehaviour",
    "S_ScriptEnvironment",
    "S_UseClublinks",
    "S_TimeLimit",
    "S_UseClublinksSponsors",
  ],
};

const TMWTTeamsMode: GameMode = {
  name: "TMWTTeams",
  script: GameModes.TMWTTeams,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_EarlyEndMatchCallback",
    "S_EnableDossardColor",
    "S_FinishTimeout",
    "S_ForceRoadSpectatorsNb",
    "S_IsMatchmaking",
    "S_MapPointsLimit",
    "S_MatchPointsLimit",
    "S_MatchInfo",
    "S_RespawnBehaviour",
    "S_SponsorsUrl",
    "S_TeamsUrl",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const TMWTMatchmakingMode: GameMode = {
  name: "TMWTMatchmaking",
  script: GameModes.TMWTMatchmaking,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_EarlyEndMatchCallback",
    "S_FinishTimeout",
    "S_MapPointsLimit",
    "S_MatchId",
    "S_MatchPointsLimit",
    "S_MatchmakingId",
    "S_RespawnBehaviour",
    "S_TeamsUrl",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const TeamsMatchmakingMode: GameMode = {
  name: "TeamsMatchmaking",
  script: GameModes.TeamsMatchmaking,
  settings: [
    ...universalSettings,
    "S_BalanceScore",
    "S_Bots_Clan",
    "S_Bots_EnablePlaying",
    "S_Bots_EnableRecording",
    "S_Bots_GhostDBId",
    "S_Bots_LevelRange",
    "S_Bots_LevelShift",
    "S_Bots_PBMultiplier",
    "S_CumulatePoints",
    "S_FinishTimeoutDivider",
    "S_ChatTime",
    "S_EarlyEndMatchCallback",
    "S_FinishTimeout",
    "S_MatchId",
    "S_MapsPerMatch",
    "S_MatchmakingId",
    "S_MaxPointsPerRound",
    "S_NoRoundTie",
    "S_PointsGap",
    "S_PointsLimit",
    "S_PointsRepartition",
    "S_PointsRepartition1VS",
    "S_PointsRepartition2VS",
    "S_RoundsPerMap",
    "S_ScriptEnvironment",
    "S_SynchronizePlayersAtRoundStart",
    "S_RespawnBehaviour",
    "S_WarmUpDuration",
    "S_UseAlternateRules",
    "S_UseCustomPointsRepartition",
    "S_UseTieBreak",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const TimeAttackDailyMode: GameMode = {
  name: "TimeAttackDaily",
  script: GameModes.TimeAttackDaily,
  settings: [
    ...universalSettings,
    "S_BasicAuthHeader",
    "S_MatchId",
    "S_IntroMaxDuration",
    "S_LogLevel",
    "S_PlayerPartition",
    "S_QualificationsEndTime_MinMargin",
    "S_RankedCompetitionType",
    "S_ScriptEnvironment",
    "S_TimeLimit",
    "S_RespawnBehaviour",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const KnockoutDailyMode: GameMode = {
  name: "KnockoutDaily",
  script: GameModes.KnockoutDaily,
  settings: [
    ...universalSettings,
    "S_MatchId",
    "S_ChatTime",
    "S_CompetitionName",
    "S_DelayBeforeNextMap",
    "S_Division",
    "S_EarlyEndMatchCallback",
    "S_EliminatedPlayersNbRanks",
    "S_FinishTimeout",
    "S_IsChannelServer",
    "S_MatchPosition",
    "S_NeutralEmblemUrl",
    "S_RankedCompetitionType",
    "S_PointsRepartition",
    "S_RoundsPerMap",
    "S_RoundsWithoutElimination",
    "S_SynchronizePlayersAtRoundStart",
    "S_ScriptEnvironment",
    "S_RespawnBehaviour",
    "S_UseClublinks",
    "S_UseClublinksSponsors",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const COTDQualificationsMode: GameMode = {
  name: "COTDQualifications",
  script: GameModes.COTDQualifications,
  settings: [
    ...universalSettings,
    "S_MatchId",
    "S_BasicAuthHeader",
    "S_IntroMaxDuration",
    "S_RankedCompetitionType",
    "S_PlayerPartition",
    "S_RespawnBehaviour",
    "S_TimeLimit",
  ],
};

const CupClassicMode: GameMode = {
  name: "CupClassic",
  script: GameModes.CupClassic,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_CompetitionName",
    "S_CupPointsLimit",
    "S_EarlyEndMatchCallback",
    "S_EnableAmbientSound",
    "S_EnablePreMatch",
    "S_EnableTrophiesGain",
    "S_EnableWinScreen",
    "S_EndRoundPostScoreUpdateDuration",
    "S_EndRoundPreScoreUpdateDuration",
    "S_FinishTimeout",
    "S_ForceRoadSpectatorsNb",
    "S_KOCheckpointNb",
    "S_KOCheckpointTime",
    "S_KOValidationDelay",
    "S_LoadMatchState",
    "S_MapWorldRecord",
    "S_MatchLevel",
    "S_MatchPointsLimit",
    "S_MatchStyle",
    "S_MatchType",
    "S_HideScoresHeader",
    "S_NbOfWinners",
    "S_OverridePlayerProfiles",
    "S_PointsRepartition",
    "S_RoundsPerMap",
    "S_SponsorsUrl",
    "S_StepNb",
    "S_StopMatchIfNotEnoughPlayers",
    "S_TrackNb",
    "S_TracksTotal",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const ChampionSpring2022Mode: GameMode = {
  name: "ChampionSpring2022",
  script: GameModes.ChampionSpring2022,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_CompetitionName",
    "S_CupPointsLimit",
    "S_EarlyEndMatchCallback",
    "S_EnableAmbientSound",
    "S_EnablePreMatch",
    "S_EnableTrophiesGain",
    "S_EnableWinScreen",
    "S_EndRoundPostScoreUpdateDuration",
    "S_EndRoundPreScoreUpdateDuration",
    "S_FinishTimeout",
    "S_ForceRoadSpectatorsNb",
    "S_KOCheckpointNb",
    "S_KOCheckpointTime",
    "S_KOValidationDelay",
    "S_LoadMatchState",
    "S_MapWorldRecord",
    "S_MatchLevel",
    "S_MatchPointsLimit",
    "S_MatchStyle",
    "S_MatchType",
    "S_HideScoresHeader",
    "S_NbOfWinners",
    "S_OverridePlayerProfiles",
    "S_PointsRepartition",
    "S_RoundsPerMap",
    "S_SponsorsUrl",
    "S_StepNb",
    "S_StopMatchIfNotEnoughPlayers",
    "S_TrackNb",
    "S_TracksTotal",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const RoyalMode: GameMode = {
  name: "Royal",
  script: GameModes.Royal,
  settings: [
    ...universalSettings,
    "S_AddBotsUntil",
    "S_AlwaysDisplayUnlockTimer",
    "S_ChatTime",
    "S_Division",
    "S_EnableGhostUpload",
    "S_GhostDBId",
    "S_IsMatchmaking",
    "S_IsSuperRoyal",
    "S_IsSuperRoyalFinale",
    "S_MatchId",
    "S_MatchWaitingScreenDuration",
    "S_MaxBotLevel",
    "S_MaxBotsTeams",
    "S_MinBotLevel",
    "S_RoundWaitingScreenDuration",
    "S_SegmentBonusTime",
    "S_SegmentUnlockInterval",
    "S_SuperRoyalRoundNumber",
    "S_TimeLimit",
  ],
};

const TMWC2023Mode: GameMode = {
  name: "TMWC2023",
  script: GameModes.TMWC2023,
  settings: [
    ...universalSettings,
    "S_ApiStageUid",
    "S_ApiTourUid",
    "S_BasicAuthHeader",
    "S_CrashDetectionThreshold",
    "S_ChatTime",
    "S_DelayBeforeNextMap",
    "S_EarlyEndMatchCallback",
    "S_EnableDossardColor",
    "S_FinishTimeout",
    "S_ForceRoadSpectatorsNb",
    "S_IsMatchmaking",
    "S_IsChannelServer",
    "S_NeutralEmblemUrl",
    "S_MapPointsLimit",
    "S_MatchPointsLimit",
    "S_PointsRepartition",
    "S_ScriptEnvironment",
    "S_MatchInfo",
    "S_RespawnBehaviour",
    "S_SponsorsUrl",
    "S_SynchronizePlayersAtRoundStart",
    "S_UseClublinks",
    "S_UseClublinksSponsors",
    "S_TeamsUrl",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const RoyalStarsMode: GameMode = {
  name: "RoyalStars",
  script: GameModes.RoyalStars,
  settings: [...universalSettings],
};

const MultiTeamsMode: GameMode = {
  name: "MultiTeams",
  script: GameModes.MultiTeams,
  settings: [
    ...universalSettings,
    "S_FinishTimeout",
    "S_MapsPerMatch",
    "S_PointsLimit",
    "S_RoundsPerMap",
    "S_TeamsNb",
    "S_UseTieBreak",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const HeadToHeadMode: GameMode = {
  name: "HeadToHead",
  script: GameModes.HeadToHead,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_EnableAmbientSound",
    "S_EnableWinScreen",
    "S_FinalistsAccountIds",
    "S_FinishTimeout",
    "S_ForceRoadSpectatorsNb",
    "S_KOCheckpointNb",
    "S_KOCheckpointTime",
    "S_KOValidationDelay",
    "S_MapPointsLimit",
    "S_MatchPointsLimit",
    "S_NbOfWinners",
    "S_OverridePlayerProfiles",
    "S_PointsRepartition",
    "S_SynchronizePlayersAtRoundStart",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
    "S_WorldRecords",
  ],
};

const Final42TMGLMode: GameMode = {
  name: "Final42TMGL",
  script: GameModes.Final42TMGL,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_EnableAmbientSound",
    "S_EnableWinScreen",
    "S_FinalistsAccountIds",
    "S_FinishTimeout",
    "S_ForceRoadSpectatorsNb",
    "S_KOCheckpointNb",
    "S_KOCheckpointTime",
    "S_KOValidationDelay",
    "S_MapPointsLimit",
    "S_MatchPointsLimit",
    "S_NbOfWinners",
    "S_OverridePlayerProfiles",
    "S_PointsRepartition",
    "S_SynchronizePlayersAtRoundStart",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
    "S_WorldRecords",
  ],
};

const CupLongMode: GameMode = {
  name: "CupLong",
  script: GameModes.CupLong,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_CompetitionName",
    "S_CupPointsLimit",
    "S_EarlyEndMatchCallback",
    "S_EnableAmbientSound",
    "S_EnablePreMatch",
    "S_EnableTrophiesGain",
    "S_EnableWinScreen",
    "S_EndRoundPostScoreUpdateDuration",
    "S_EndRoundPreScoreUpdateDuration",
    "S_FinishTimeout",
    "S_ForceRoadSpectatorsNb",
    "S_KOCheckpointNb",
    "S_KOCheckpointTime",
    "S_KOValidationDelay",
    "S_LoadMatchState",
    "S_MapWorldRecord",
    "S_MatchLevel",
    "S_MatchPointsLimit",
    "S_MatchStyle",
    "S_MatchType",
    "S_HideScoresHeader",
    "S_NbOfWinners",
    "S_OverridePlayerProfiles",
    "S_PointsRepartition",
    "S_RoundsPerMap",
    "S_SponsorsUrl",
    "S_StepNb",
    "S_StopMatchIfNotEnoughPlayers",
    "S_TrackNb",
    "S_TracksTotal",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const CupShortMode: GameMode = {
  name: "CupShort",
  script: GameModes.CupShort,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_CompetitionName",
    "S_CupPointsLimit",
    "S_EarlyEndMatchCallback",
    "S_EnableAmbientSound",
    "S_EnablePreMatch",
    "S_EnableTrophiesGain",
    "S_EnableWinScreen",
    "S_EndRoundPostScoreUpdateDuration",
    "S_EndRoundPreScoreUpdateDuration",
    "S_FinishTimeout",
    "S_ForceRoadSpectatorsNb",
    "S_KOCheckpointNb",
    "S_KOCheckpointTime",
    "S_KOValidationDelay",
    "S_LoadMatchState",
    "S_MapWorldRecord",
    "S_MatchLevel",
    "S_MatchPointsLimit",
    "S_MatchStyle",
    "S_MatchType",
    "S_HideScoresHeader",
    "S_NbOfWinners",
    "S_OverridePlayerProfiles",
    "S_PointsRepartition",
    "S_RoundsPerMap",
    "S_SponsorsUrl",
    "S_StepNb",
    "S_StopMatchIfNotEnoughPlayers",
    "S_TrackNb",
    "S_TracksTotal",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const RoundsBouletMode: GameMode = {
  name: "RoundsBoulet",
  script: GameModes.RoundsBoulet,
  settings: [
    ...universalSettings,
    "S_ChatTime",
    "S_DelayBeforeNextMap",
    "S_FinishTimeout",
    "S_MapsPerMatch",
    "S_PointsLimit",
    "S_PointsRepartition",
    "S_RoundsPerMap",
    "S_InfiniteLaps",
    "S_IsChannelServer",
    "S_NeutralEmblemUrl",
    "S_RespawnBehaviour",
    "S_ScriptEnvironment",
    "S_SynchronizePlayersAtRoundStart",
    "S_UseClublinks",
    "S_UseClublinksSponsors",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const TMWC2025Mode: GameMode = {
  name: "TMWC2025",
  script: GameModes.TMWC2025,
  settings: [
    ...universalSettings,
    "S_ApiAuthorizationHeader",
    "S_ApiCompetitionUid",
    "S_ApiUrl",
    "S_ChatTime",
    "S_DelayBeforeNextMap",
    "S_DisableMatchIntro",
    "S_EnableDossardColor",
    "S_FinishTimeout",
    "S_ForceRoadSpectatorsNb",
    "S_HeaderLogoUrl",
    "S_IntroBackgroundUrl",
    "S_IntroLogoUrl",
    "S_IsMatchmaking",
    "S_NeutralEmblemUrl",
    "S_MapPointsLimit",
    "S_MatchPointsLimit",
    "S_PointsRepartition",
    "S_ScriptEnvironment",
    "S_MatchInfo",
    "S_SponsorsUrl",
    "S_SynchronizePlayersAtRoundStart",
    "S_Sign16x9DefaultUrl",
    "S_Sign2x3DefaultUrl",
    "S_Sign64x10DefaultUrl",
    "S_TeamsUrl",
    "S_WarmUpDuration",
    "S_WarmUpNb",
    "S_WarmUpTimeout",
  ],
};

const gameModes: GameMode[] = [
  CupMode,
  KnockoutMode,
  LapsMode,
  TeamsMode,
  TimeAttackMode,
  RoundsMode,
  RoyalTimeAttackMode,
  TMWTTeamsMode,
  TMWTMatchmakingMode,
  TeamsMatchmakingMode,
  TimeAttackDailyMode,
  KnockoutDailyMode,
  COTDQualificationsMode,
  CupClassicMode,
  ChampionSpring2022Mode,
  RoyalMode,
  TMWC2023Mode,
  RoyalStarsMode,
  MultiTeamsMode,
  HeadToHeadMode,
  Final42TMGLMode,
  CupLongMode,
  CupShortMode,
  RoundsBouletMode,
  TMWC2025Mode,
];

export function getGameModeByScript(script: string): GameMode | undefined {
  return gameModes.find((mode) => mode.script === script);
}

export function getGameModeWithScriptSettings(
  script: string,
): GameModeWithSettings | undefined {
  const mode = getGameModeByScript(script);
  if (!mode) {
    return undefined;
  }

  const modeSettings: Record<string, Setting> = {};
  for (const settingName of mode.settings) {
    const setting = settings[settingName];
    if (setting) {
      modeSettings[settingName] = {
        value: setting.value[script as GameModes],
        type: setting.type,
      };
    }
  }

  return {
    ...mode,
    scriptSettings: modeSettings,
  };
}

export function getUpdatedSettingsForGameMode(
  script: string,
  updatedSettings: Record<string, number | string | boolean | undefined>,
): Record<string, Setting> {
  const modeWithSettings = getGameModeWithScriptSettings(script);
  if (!modeWithSettings) {
    throw new Error(`Game mode with script ${script} not found.`);
  }

  const newSettings: Record<string, Setting> = {};
  for (const settingName of Object.keys(updatedSettings)) {
    const setting = modeWithSettings.scriptSettings[settingName];

    if (!setting) {
      newSettings[settingName] = {
        value: undefined,
        type: "string",
      };
      continue;
    }

    if (setting.value !== updatedSettings[settingName]) {
      newSettings[settingName] = {
        value: updatedSettings[settingName],
        type: setting.type,
      };
    }
  }

  return newSettings;
}

export function getDefaultSetting(
  script: string,
  settingName: string,
): number | string | boolean | undefined {
  const modeWithSettings = getGameModeWithScriptSettings(script);
  if (!modeWithSettings) {
    throw new Error(`Game mode with script ${script} not found.`);
  }

  const setting = modeWithSettings.scriptSettings[settingName];

  if (!setting) {
    return undefined;
  }

  return setting.value;
}

export function generateScript(
  script: string,
  settings: Record<string, Setting>,
): string {
  let scriptContent = `#Extends "Modes/${script}"\n\n`;

  for (const [settingName, setting] of Object.entries(settings)) {
    if (setting.value !== undefined) {
      switch (setting.type) {
        case "boolean":
          scriptContent += `#Setting ${settingName} ${setting.value ? "True" : "False"}\n`;
          break;
        case "int":
        case "float":
          scriptContent += `#Setting ${settingName} ${setting.value ?? ""}\n`;
          break;
        case "string":
          scriptContent += `#Setting ${settingName} "${setting.value ?? ""}"\n`;
          break;
        default:
          throw new Error(`Unsupported setting type: ${setting.type}`);
      }
    }
  }

  return scriptContent;
}

export {
  ChampionSpring2022Mode,
  COTDQualificationsMode,
  CupClassicMode,
  CupLongMode,
  CupMode,
  CupShortMode,
  Final42TMGLMode,
  gameModes,
  gameModesScripts,
  HeadToHeadMode,
  KnockoutDailyMode,
  KnockoutMode,
  LapsMode,
  MultiTeamsMode,
  RoundsBouletMode,
  RoundsMode,
  RoyalMode,
  RoyalStarsMode,
  RoyalTimeAttackMode,
  settings,
  TeamsMatchmakingMode,
  TeamsMode,
  TimeAttackDailyMode,
  TimeAttackMode,
  TMWC2023Mode,
  TMWC2025Mode,
  TMWTMatchmakingMode,
  TMWTTeamsMode
};

