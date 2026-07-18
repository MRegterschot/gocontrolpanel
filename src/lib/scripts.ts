import { ModeScriptInfo } from "@/types/gbx";

export const gameModesScripts = [
  "Trackmania/TM_TimeAttack_Online.Script.txt",
  "Trackmania/TM_Laps_Online.Script.txt",
  "Trackmania/TM_Rounds_Online.Script.txt",
  "Trackmania/TM_Cup_Online.Script.txt",
  "Trackmania/TM_Teams_Online.Script.txt",
  "Trackmania/TM_Knockout_Online.Script.txt",
  "Trackmania/Deprecated/TM_Champion_Online.Script.txt",
  "Trackmania/TM_RoyalTimeAttack_Online.Script.txt",
  "Trackmania/TM_StuntMulti_Online.Script.txt",
  "Trackmania/TM_Platform_Online.Script.txt",
  "TrackMania/TM_TMWC2023_Online.Script.txt",
  "TrackMania/TM_TMWTTeams_Online.Script.txt",
];

const TimeAttackGamemode: ModeScriptInfo = {
  Name: "Trackmania/TM_TimeAttack_Online.Script.txt",
  CompatibleMapTypes: "TrackMania\\TM_Race,TM_Race",
  Description:
    "$zIn $<$t$6F9Time Attack$> mode, the goal is to set the $<$t$6F9best time$>.\n\nYou have as many tries as you want, and you can $<$t$6F9retry$> when you want by pressing the respawn button.\n\nWhen the time is up, the $<$t$6F9winner$> is the player with the $<$t$6F9best time$>.",
  Version: "1.2.0+2025-06-11",
  ParamDescs: [
    {
      Name: "S_ChatTime",
      Desc: "Chat time",
      Type: "int",
      Default: "10",
    },
    {
      Name: "S_UseClublinks",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_UseClublinksSponsors",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_NeutralEmblemUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ScriptEnvironment",
      Desc: "<hidden>",
      Type: "string",
      Default: "production",
    },
    {
      Name: "S_IsChannelServer",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DelayBeforeNextMap",
      Desc: "<hidden>",
      Type: "int",
      Default: "2000",
    },
    {
      Name: "S_RespawnBehaviour",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ForceLapsNb",
      Desc: "Forced laps number",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_InfiniteLaps",
      Desc: "Infinite laps",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_EnableJoinLeaveNotifications",
      Desc: "Enable join and leave notifications",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SeasonIds",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_IsSplitScreen",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DecoImageUrl_WhoAmIUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "/api/club/room/:ServerLogin/whoami",
    },
    {
      Name: "S_DecoImageUrl_Checkpoint",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_DecalSponsor4x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x9",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen8x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ClubId",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ClubName",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_LoadingScreenImageUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_TrustClientSimu",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_UseCrudeExtrapolation",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SynchronizePlayersAtMapStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_DisableGoToMap",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Enable",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Style",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_TimeLimit",
      Desc: "Time limit",
      Type: "int",
      Default: "300",
    },
    {
      Name: "S_WarmUpNb",
      Desc: "Number of warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpDuration",
      Desc: "Duration of one warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpTimeout",
      Desc: "Warm up timeout",
      Type: "int",
      Default: "-1",
    },
  ],
  CommandDescs: [],
};

const LapsGamemode: ModeScriptInfo = {
  Name: "Trackmania/TM_Laps_Online.Script.txt",
  CompatibleMapTypes: "TrackMania\\TM_Race,TM_Race",
  Description:
    "$zIn $<$t$6F9Laps$> mode, the goal is to drive as far as possible by passing $<$t$6F9checkpoints$>.\n\nThe laps mode takes place on multilap (cyclical) tracks, and is played in one go for every track.\n\nWhen the time is up, the $<$t$6F9winner$> is the player who passed the most $<$t$6F9checkpoints$>. In case of draws, the winner is the player who passed the last checkpoint first.",
  Version: "1.1.0+2025-12-17",
  ParamDescs: [
    {
      Name: "S_ChatTime",
      Desc: "Chat time",
      Type: "int",
      Default: "10",
    },
    {
      Name: "S_UseClublinks",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_UseClublinksSponsors",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_NeutralEmblemUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ScriptEnvironment",
      Desc: "<hidden>",
      Type: "string",
      Default: "production",
    },
    {
      Name: "S_IsChannelServer",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DelayBeforeNextMap",
      Desc: "<hidden>",
      Type: "int",
      Default: "2000",
    },
    {
      Name: "S_RespawnBehaviour",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ForceLapsNb",
      Desc: "Forced laps number",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_InfiniteLaps",
      Desc: "Infinite laps",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_EnableJoinLeaveNotifications",
      Desc: "Enable join and leave notifications",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SeasonIds",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_IsSplitScreen",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DecoImageUrl_WhoAmIUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "/api/club/room/:ServerLogin/whoami",
    },
    {
      Name: "S_DecoImageUrl_Checkpoint",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_DecalSponsor4x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x9",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen8x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ClubId",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ClubName",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_LoadingScreenImageUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_TrustClientSimu",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_UseCrudeExtrapolation",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SynchronizePlayersAtMapStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_DisableGoToMap",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Enable",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Style",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_TimeLimit",
      Desc: "Time limit",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_FinishTimeout",
      Desc: "Finish timeout",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_DisableGiveUp",
      Desc: "Disable give up",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_WarmUpNb",
      Desc: "Number of warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpDuration",
      Desc: "Duration of one warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpTimeout",
      Desc: "Warm up timeout",
      Type: "int",
      Default: "-1",
    },
  ],
  CommandDescs: [],
};

const RoundsGamemode: ModeScriptInfo = {
  Name: "Trackmania/TM_Rounds_Online.Script.txt",
  CompatibleMapTypes: "TrackMania\\TM_Race,TM_Race",
  Description:
    "$zIn $<$t$6F9Rounds$z$z$> mode, the goal is to win a maximum number of $<$t$6F9points.\n\n$z$>The rounds mode consists of $<$t$6F9a series of races$z$>.\nWhen you finish a race in a good $<$t$6F9position$z$>, you get $<$t$6F9points$z$>, added to your total.\n\nThe $<$t$6F9winner$z$> is the first player whose total reaches the $<$t$6F9point limit$z$> (30 for example).",
  Version: "1.1.1+2024-12-05",
  ParamDescs: [
    {
      Name: "S_ChatTime",
      Desc: "Chat time",
      Type: "int",
      Default: "10",
    },
    {
      Name: "S_UseClublinks",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_UseClublinksSponsors",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_NeutralEmblemUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ScriptEnvironment",
      Desc: "<hidden>",
      Type: "string",
      Default: "production",
    },
    {
      Name: "S_IsChannelServer",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DelayBeforeNextMap",
      Desc: "<hidden>",
      Type: "int",
      Default: "2000",
    },
    {
      Name: "S_RespawnBehaviour",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ForceLapsNb",
      Desc: "Forced laps number",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_InfiniteLaps",
      Desc: "Infinite laps",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_EnableJoinLeaveNotifications",
      Desc: "Enable join and leave notifications",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SeasonIds",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_IsSplitScreen",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DecoImageUrl_WhoAmIUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "/api/club/room/:ServerLogin/whoami",
    },
    {
      Name: "S_DecoImageUrl_Checkpoint",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_DecalSponsor4x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x9",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen8x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ClubId",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ClubName",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_LoadingScreenImageUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_TrustClientSimu",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_UseCrudeExtrapolation",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SynchronizePlayersAtMapStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_DisableGoToMap",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Enable",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Style",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_PointsRepartition",
      Desc: "Custom points distribution",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_SynchronizePlayersAtRoundStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_PointsLimit",
      Desc: "Points limit",
      Type: "int",
      Default: "50",
    },
    {
      Name: "S_FinishTimeout",
      Desc: "Finish timeout",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_RoundsPerMap",
      Desc: "Number of rounds per track",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_MapsPerMatch",
      Desc: "Number of tracks per match",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_UseTieBreak",
      Desc: "Use tie-break",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_WarmUpNb",
      Desc: "Number of warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpDuration",
      Desc: "Duration of one warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpTimeout",
      Desc: "Warm up timeout",
      Type: "int",
      Default: "-1",
    },
  ],
  CommandDescs: [],
};

const CupGamemode: ModeScriptInfo = {
  Name: "Trackmania/TM_Cup_Online.Script.txt",
  CompatibleMapTypes: "TrackMania\\TM_Race,TM_Race",
  Description:
    "$zThe cup mode consists of $<$t$6F9a series of races on multiple tracks$>.\n\nWhen you finish a race in a good $<$t$6F9position$>, you get $<$t$6F9points$> added to your total.\nServers might propose warmup races to get familiar with a track first.\n\nTo win, you must first reach the $<$t$6F9point limit$> to become a $<$t$6F9finalist$>. Once you are a finalist, you must finish a race in $<$t$6F9first position$> to win the cup.The cup mode ends once 3 players have managed to become finalists and to finish first.",
  Version: "1.1.1+2024-12-05",
  ParamDescs: [
    {
      Name: "S_ChatTime",
      Desc: "Chat time",
      Type: "int",
      Default: "10",
    },
    {
      Name: "S_UseClublinks",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_UseClublinksSponsors",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_NeutralEmblemUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ScriptEnvironment",
      Desc: "<hidden>",
      Type: "string",
      Default: "production",
    },
    {
      Name: "S_IsChannelServer",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DelayBeforeNextMap",
      Desc: "<hidden>",
      Type: "int",
      Default: "2000",
    },
    {
      Name: "S_RespawnBehaviour",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ForceLapsNb",
      Desc: "Forced laps number",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_InfiniteLaps",
      Desc: "Infinite laps",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_EnableJoinLeaveNotifications",
      Desc: "Enable join and leave notifications",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SeasonIds",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_IsSplitScreen",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DecoImageUrl_WhoAmIUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "/api/club/room/:ServerLogin/whoami",
    },
    {
      Name: "S_DecoImageUrl_Checkpoint",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_DecalSponsor4x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x9",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen8x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ClubId",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ClubName",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_LoadingScreenImageUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_TrustClientSimu",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_UseCrudeExtrapolation",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SynchronizePlayersAtMapStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_DisableGoToMap",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Enable",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Style",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_PointsRepartition",
      Desc: "Custom points distribution",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_SynchronizePlayersAtRoundStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_PointsLimit",
      Desc: "Points limit",
      Type: "int",
      Default: "100",
    },
    {
      Name: "S_FinishTimeout",
      Desc: "Finish timeout",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_RoundsPerMap",
      Desc: "Number of rounds per track",
      Type: "int",
      Default: "5",
    },
    {
      Name: "S_NbOfWinners",
      Desc: "Number of winners",
      Type: "int",
      Default: "3",
    },
    {
      Name: "S_WarmUpNb",
      Desc: "Number of warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpDuration",
      Desc: "Duration of one warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpTimeout",
      Desc: "Warm up timeout",
      Type: "int",
      Default: "-1",
    },
  ],
  CommandDescs: [],
};

const TeamsGamemode: ModeScriptInfo = {
  Name: "Trackmania/TM_Teams_Online.Script.txt",
  CompatibleMapTypes: "TrackMania\\TM_Race,TM_Race",
  Description:
    "$zIn $<$t$6F9Team$> mode, you have to choose a team : $<$t$f00Red$> or $<$t$10cBlue$>.\n\nThe team mode consists of $<$t$6F9a series of races$>.\nThe goal for your team is to win a maximum number of $<$t$6F9points$>.\n\nWhen you finish a race with a good $<$t$6F9position$>, you give $<$t$6F9points$> to your team.\nThe $<$t$6F9winning team$> is the first team whose total reaches the $<$t$6F9point limit$> (5 for example).",
  Version: "1.0.2+2024-12-05",
  ParamDescs: [
    {
      Name: "S_ChatTime",
      Desc: "Chat time",
      Type: "int",
      Default: "10",
    },
    {
      Name: "S_UseClublinks",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_UseClublinksSponsors",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_NeutralEmblemUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ScriptEnvironment",
      Desc: "<hidden>",
      Type: "string",
      Default: "production",
    },
    {
      Name: "S_IsChannelServer",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DelayBeforeNextMap",
      Desc: "<hidden>",
      Type: "int",
      Default: "2000",
    },
    {
      Name: "S_RespawnBehaviour",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ForceLapsNb",
      Desc: "Forced laps number",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_InfiniteLaps",
      Desc: "Infinite laps",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_EnableJoinLeaveNotifications",
      Desc: "Enable join and leave notifications",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SeasonIds",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_IsSplitScreen",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DecoImageUrl_WhoAmIUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "/api/club/room/:ServerLogin/whoami",
    },
    {
      Name: "S_DecoImageUrl_Checkpoint",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_DecalSponsor4x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x9",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen8x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ClubId",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ClubName",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_LoadingScreenImageUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_TrustClientSimu",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_UseCrudeExtrapolation",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SynchronizePlayersAtMapStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_DisableGoToMap",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Enable",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Style",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_PointsRepartition",
      Desc: "Custom points distribution",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_SynchronizePlayersAtRoundStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_PointsLimit",
      Desc: "Points limit",
      Type: "int",
      Default: "5",
    },
    {
      Name: "S_FinishTimeout",
      Desc: "Finish timeout",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_MaxPointsPerRound",
      Desc: "Max points :",
      Type: "int",
      Default: "6",
    },
    {
      Name: "S_PointsGap",
      Desc: "Points gap :",
      Type: "int",
      Default: "1",
    },
    {
      Name: "S_UseCustomPointsRepartition",
      Desc: "Use a custom points repartition :",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_CumulatePoints",
      Desc: "Cumulate team points :",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_RoundsPerMap",
      Desc: "Number of rounds per track :",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_MapsPerMatch",
      Desc: "Number of tracks per match :",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_UseTieBreak",
      Desc: "Use tie-break :",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_WarmUpNb",
      Desc: "Number of warm up :",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpDuration",
      Desc: "Duration of one warm up :",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpTimeout",
      Desc: "Warm up timeout",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_UseAlternateRules",
      Desc: "Use alternate rules :",
      Type: "boolean",
      Default: "True",
    },
  ],
  CommandDescs: [],
};

const KnockoutGamemode: ModeScriptInfo = {
  Name: "Trackmania/TM_Knockout_Online.Script.txt",
  CompatibleMapTypes: "TrackMania\\TM_Race,TM_Race",
  Description:
    "$zIn $<$t$6F9Knockout$> mode, the goal is to be the last player standing. \n\nYou play a series of races as in Round mode. $<$t$6F9At the end of each race, the last players are eliminated$>!\n\nThe winner is the player who eliminates all of their opponents.",
  Version: "1.1.3+2026-01-07",
  ParamDescs: [
    {
      Name: "S_ChatTime",
      Desc: "Chat time",
      Type: "int",
      Default: "6",
    },
    {
      Name: "S_UseClublinks",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_UseClublinksSponsors",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_NeutralEmblemUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ScriptEnvironment",
      Desc: "<hidden>",
      Type: "string",
      Default: "production",
    },
    {
      Name: "S_IsChannelServer",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DelayBeforeNextMap",
      Desc: "<hidden>",
      Type: "int",
      Default: "2000",
    },
    {
      Name: "S_RespawnBehaviour",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ForceLapsNb",
      Desc: "Forced laps number",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_InfiniteLaps",
      Desc: "Infinite laps",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_EnableJoinLeaveNotifications",
      Desc: "Enable join and leave notifications",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_SeasonIds",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_IsSplitScreen",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DecoImageUrl_WhoAmIUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "/api/club/room/:ServerLogin/whoami",
    },
    {
      Name: "S_DecoImageUrl_Checkpoint",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_DecalSponsor4x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x9",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen8x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ClubId",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ClubName",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_LoadingScreenImageUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_TrustClientSimu",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_UseCrudeExtrapolation",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SynchronizePlayersAtMapStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_DisableGoToMap",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Enable",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Style",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_PointsRepartition",
      Desc: "Custom points distribution",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_SynchronizePlayersAtRoundStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_FinishTimeout",
      Desc: "Finish timeout",
      Type: "int",
      Default: "5",
    },
    {
      Name: "S_RoundsPerMap",
      Desc: "Number of rounds per track",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_WarmUpNb",
      Desc: "Number of warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpDuration",
      Desc: "Duration of one warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpTimeout",
      Desc: "Warm up timeout",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_EliminatedPlayersNbRanks",
      Desc: "Nb of players above which one extra elim. /round",
      Type: "string",
      Default: "4,16,16",
    },
    {
      Name: "S_RoundsWithoutElimination",
      Desc: "Rounds without elimination",
      Type: "int",
      Default: "1",
    },
    {
      Name: "S_EarlyEndMatchCallback",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_MatchPosition",
      Desc: "<hidden>",
      Type: "int",
      Default: "-1",
    },
  ],
  CommandDescs: [],
};

const ChampionGamemode: ModeScriptInfo = {
  Name: "Trackmania/Deprecated/TM_Champion_Online.Script.txt",
  CompatibleMapTypes: "TrackMania\\TM_Race,TM_Race",
  Description: "Champion mode",
  Version: "1.0.2+2024-12-05",
  ParamDescs: [
    {
      Name: "S_ChatTime",
      Desc: "Chat time",
      Type: "int",
      Default: "30",
    },
    {
      Name: "S_UseClublinks",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_UseClublinksSponsors",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_NeutralEmblemUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ScriptEnvironment",
      Desc: "<hidden>",
      Type: "string",
      Default: "production",
    },
    {
      Name: "S_IsChannelServer",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DelayBeforeNextMap",
      Desc: "<hidden>",
      Type: "int",
      Default: "2000",
    },
    {
      Name: "S_RespawnBehaviour",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ForceLapsNb",
      Desc: "Forced laps number",
      Type: "int",
      Default: "3",
    },
    {
      Name: "S_InfiniteLaps",
      Desc: "Infinite laps",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_EnableJoinLeaveNotifications",
      Desc: "Enable join and leave notifications",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SeasonIds",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_IsSplitScreen",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DecoImageUrl_WhoAmIUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "/api/club/room/:ServerLogin/whoami",
    },
    {
      Name: "S_DecoImageUrl_Checkpoint",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_DecalSponsor4x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x9",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen8x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ClubId",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ClubName",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_LoadingScreenImageUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_TrustClientSimu",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_UseCrudeExtrapolation",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SynchronizePlayersAtMapStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_DisableGoToMap",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Enable",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Style",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_PointsRepartition",
      Desc: "Custom points distribution",
      Type: "string",
      Default: "20,14,12,10,8,7,6,5,5,4,4,3,3,2,2,1",
    },
    {
      Name: "S_SynchronizePlayersAtRoundStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_PointsLimit",
      Desc: "",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_RoundsPerMap",
      Desc: "<hidden>",
      Type: "int",
      Default: "1",
    },
    {
      Name: "S_RoundsLimit",
      Desc: "Number of rounds played",
      Type: "int",
      Default: "6",
    },
    {
      Name: "S_PauseBeforeRoundNb",
      Desc: "Round with a pause before its start",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_PauseDuration",
      Desc: "Pause time in seconds",
      Type: "int",
      Default: "360",
    },
    {
      Name: "S_WinnersRatio",
      Desc: "Round winners ratio",
      Type: "double",
      Default: "0.5",
    },
    {
      Name: "S_ForceWinnersNb",
      Desc: "Force the number of winners",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_TimeOutPlayersNumber",
      Desc: "Players crossing finish line before timeout",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_FinishTimeout",
      Desc: "Time to finish the race after the winners",
      Type: "int",
      Default: "5",
    },
    {
      Name: "S_TimeLimit",
      Desc: "Time limit",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_WarmUpNb",
      Desc: "Number of warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpDuration",
      Desc: "Duration of one warm up",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_WarmUpTimeout",
      Desc: "Warm up timeout",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_DisableGiveUp",
      Desc: "Disable give up",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_UseTieBreak",
      Desc: "Use tie-break",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_BestLapBonusPoints",
      Desc: "Best lap bonus points",
      Type: "int",
      Default: "2",
    },
    {
      Name: "S_RoundsWithAPhaseChange",
      Desc: "Rounds with a phase change",
      Type: "string",
      Default: "3,5",
    },
    {
      Name: "S_EarlyEndMatchCallback",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_EndRoundPreScoreUpdateDuration",
      Desc: "<hidden>",
      Type: "int",
      Default: "5",
    },
    {
      Name: "S_EndRoundPostScoreUpdateDuration",
      Desc: "<hidden>",
      Type: "int",
      Default: "5",
    },
  ],
  CommandDescs: [
    {
      Name: "Command_StartNewMatch",
      Desc: "Start a new match",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "Command_SetRoundNb",
      Desc: "Set round number",
      Type: "int",
      Default: "0",
    },
  ],
};

const TMWC2023Gamemode: ModeScriptInfo = {
  Name: "TrackMania/TM_TMWC2023_Online.Script.txt",
  CompatibleMapTypes: "TrackMania\\TM_Race,TM_Race",
  Description:
    "Two teams compete in a series of races. The first team to reach the point limit wins the track. The first team to win enough tracks wins the match.",
  Version: "1.2.0+2025-03-06",
  ParamDescs: [
    {
      Name: "S_ChatTime",
      Desc: "Chat time",
      Type: "int",
      Default: "600",
    },
    {
      Name: "S_UseClublinks",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_UseClublinksSponsors",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_NeutralEmblemUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ScriptEnvironment",
      Desc: "<hidden>",
      Type: "string",
      Default: "production",
    },
    {
      Name: "S_IsChannelServer",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DelayBeforeNextMap",
      Desc: "<hidden>",
      Type: "int",
      Default: "2000",
    },
    {
      Name: "S_RespawnBehaviour",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ForceLapsNb",
      Desc: "Forced laps number",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_InfiniteLaps",
      Desc: "Infinite laps",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_EnableJoinLeaveNotifications",
      Desc: "Enable join and leave notifications",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SeasonIds",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_IsSplitScreen",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DecoImageUrl_WhoAmIUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "/api/club/room/:ServerLogin/whoami",
    },
    {
      Name: "S_DecoImageUrl_Checkpoint",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_DecalSponsor4x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x9",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen8x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ClubId",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ClubName",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_LoadingScreenImageUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_TrustClientSimu",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_UseCrudeExtrapolation",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SynchronizePlayersAtMapStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_DisableGoToMap",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Enable",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_PickAndBan_Style",
      Desc: "<hidden>",
      Type: "string",
      Default:
        '{\n\t"Background": "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWT/UI/TMWT_MatchIntroBackground.dds",\n\t"TopLeftLogo": "",\n\t"TopRightLogo": "",\n\t"BottomLogo": "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWT/BrandsLogo/TMWT_Logo.dds"\n}',
    },
    {
      Name: "S_PointsRepartition",
      Desc: "Custom points distribution",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_SynchronizePlayersAtRoundStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_ApiUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ApiCompetitionUid",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ApiAuthorizationHeader",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_CrashDetectionThreshold",
      Desc: "Time delta in ms with the first player that will be considered as a crash",
      Type: "int",
      Default: "2000",
    },
    {
      Name: "S_MapPointsLimit",
      Desc: "Track points limit",
      Type: "int",
      Default: "10",
    },
    {
      Name: "S_MatchPointsLimit",
      Desc: "Match points limit",
      Type: "int",
      Default: "5",
    },
    {
      Name: "S_FinishTimeout",
      Desc: "Finish timeout",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_WarmUpNb",
      Desc: "Number of warm up",
      Type: "int",
      Default: "1",
    },
    {
      Name: "S_WarmUpDuration",
      Desc: "Duration of one warm up",
      Type: "int",
      Default: "20",
    },
    {
      Name: "S_WarmUpTimeout",
      Desc: "Warm up timeout",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_MatchInfo",
      Desc: "Match info displayed in the UI",
      Type: "string",
      Default: "Trackmania World Championship",
    },
    {
      Name: "S_TeamsUrl",
      Desc: "Teams URL",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_SponsorsUrl",
      Desc: "Sponsors URL",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_Sign2x3DefaultUrl",
      Desc: "<hidden>",
      Type: "string",
      Default:
        "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWT/Sign2x3/Default.dds",
    },
    {
      Name: "S_Sign16x9DefaultUrl",
      Desc: "<hidden>",
      Type: "string",
      Default:
        "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWC2023/Sign16x9/TMWC2023_16x9.dds",
    },
    {
      Name: "S_Sign64x10DefaultUrl",
      Desc: "<hidden>",
      Type: "string",
      Default:
        "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWT/Sign64x10/Default.dds",
    },
    {
      Name: "S_ForceRoadSpectatorsNb",
      Desc: "<hidden>",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_EarlyEndMatchCallback",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_EnableDossardColor",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_IsMatchmaking",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
  ],
  CommandDescs: [],
};

const TMWTTeamsGamemode: ModeScriptInfo = {
  Name: "TrackMania/TM_TMWTTeams_Online.Script.txt",
  CompatibleMapTypes: "TrackMania\\TM_Race,TM_Race",
  Description:
    "Two teams compete in a series of races. The first team to reach the point limit wins the track. The first team to win enough tracks wins the match.",
  Version: "1.1.0+2025-03-06",
  ParamDescs: [
    {
      Name: "S_ChatTime",
      Desc: "Chat time",
      Type: "int",
      Default: "600",
    },
    {
      Name: "S_UseClublinks",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_UseClublinksSponsors",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_NeutralEmblemUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ScriptEnvironment",
      Desc: "<hidden>",
      Type: "string",
      Default: "production",
    },
    {
      Name: "S_IsChannelServer",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DelayBeforeNextMap",
      Desc: "<hidden>",
      Type: "int",
      Default: "2000",
    },
    {
      Name: "S_RespawnBehaviour",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ForceLapsNb",
      Desc: "Forced laps number",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_InfiniteLaps",
      Desc: "Infinite laps",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_EnableJoinLeaveNotifications",
      Desc: "Enable join and leave notifications",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SeasonIds",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_IsSplitScreen",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_DecoImageUrl_WhoAmIUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "/api/club/room/:ServerLogin/whoami",
    },
    {
      Name: "S_DecoImageUrl_Checkpoint",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_DecalSponsor4x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x9",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen8x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_DecoImageUrl_Screen16x1",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_ClubId",
      Desc: "<hidden>",
      Type: "int",
      Default: "0",
    },
    {
      Name: "S_ClubName",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_LoadingScreenImageUrl",
      Desc: "<hidden>",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_TrustClientSimu",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_UseCrudeExtrapolation",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_SynchronizePlayersAtMapStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_DisableGoToMap",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_PickAndBan_Enable",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_PickAndBan_Style",
      Desc: "<hidden>",
      Type: "string",
      Default:
        '{\n\t"Background": "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWT/UI/TMWT_MatchIntroBackground.dds",\n\t"TopLeftLogo": "",\n\t"TopRightLogo": "",\n\t"BottomLogo": "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWT/BrandsLogo/TMWT_Logo.dds"\n}',
    },
    {
      Name: "S_PointsRepartition",
      Desc: "Custom points distribution",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_SynchronizePlayersAtRoundStart",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_MapPointsLimit",
      Desc: "Track points limit",
      Type: "int",
      Default: "10",
    },
    {
      Name: "S_MatchPointsLimit",
      Desc: "Match points limit",
      Type: "int",
      Default: "4",
    },
    {
      Name: "S_FinishTimeout",
      Desc: "Finish timeout",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_WarmUpNb",
      Desc: "Number of warm up",
      Type: "int",
      Default: "1",
    },
    {
      Name: "S_WarmUpDuration",
      Desc: "Duration of one warm up",
      Type: "int",
      Default: "20",
    },
    {
      Name: "S_WarmUpTimeout",
      Desc: "Warm up timeout",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_MatchInfo",
      Desc: "Match info displayed in the UI",
      Type: "string",
      Default: "Trackmania World Tour",
    },
    {
      Name: "S_TeamsUrl",
      Desc: "Teams URL",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_SponsorsUrl",
      Desc: "Sponsors URL",
      Type: "string",
      Default: "",
    },
    {
      Name: "S_Sign2x3DefaultUrl",
      Desc: "<hidden>",
      Type: "string",
      Default:
        "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWT/Sign2x3/Default.dds",
    },
    {
      Name: "S_Sign16x9DefaultUrl",
      Desc: "<hidden>",
      Type: "string",
      Default:
        "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWT/Sign16x9/TMWT_16x9.dds",
    },
    {
      Name: "S_Sign64x10DefaultUrl",
      Desc: "<hidden>",
      Type: "string",
      Default:
        "file://Media/Manialinks/Nadeo/Trackmania/Modes/TMWT/Sign64x10/Default.dds",
    },
    {
      Name: "S_DisableMatchIntro",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
    {
      Name: "S_ForceRoadSpectatorsNb",
      Desc: "<hidden>",
      Type: "int",
      Default: "-1",
    },
    {
      Name: "S_EarlyEndMatchCallback",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_EnableDossardColor",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "True",
    },
    {
      Name: "S_IsMatchmaking",
      Desc: "<hidden>",
      Type: "boolean",
      Default: "False",
    },
  ],
  CommandDescs: [],
};

const gameModes: ModeScriptInfo[] = [
  TimeAttackGamemode,
  LapsGamemode,
  RoundsGamemode,
  CupGamemode,
  KnockoutGamemode,
  TeamsGamemode,
  ChampionGamemode,
  TMWC2023Gamemode,
  TMWTTeamsGamemode,
];

export function getGameModeByScript(
  script: string,
): ModeScriptInfo | undefined {
  return gameModes.find((mode) => mode.Name === script);
}

export function getUpdatedSettingsForGameMode(
  script: string,
  updatedSettings: Record<string, number | string | boolean | undefined>,
): Record<
  string,
  {
    value?: string | number | boolean;
    type: "string" | "int" | "float" | "boolean";
  }
> {
  const mode = getGameModeByScript(script);
  if (!mode) {
    throw new Error(`Game mode with script ${script} not found.`);
  }

  const newSettings: Record<
    string,
    {
      value?: string | number | boolean;
      type: "string" | "int" | "float" | "boolean";
    }
  > = {};
  for (const settingName of Object.keys(updatedSettings)) {
    const setting = mode.ParamDescs.find((param) => param.Name === settingName);

    if (!setting) {
      newSettings[settingName] = {
        value: updatedSettings[settingName],
        type: "string",
      };
      continue;
    }

    if (
      getNormalizedSetting(setting.Default, setting.Type) !=
      updatedSettings[settingName]
    ) {
      newSettings[settingName] = {
        value: updatedSettings[settingName],
        type: setting.Type as "string" | "int" | "float" | "boolean",
      };
    }
  }

  return newSettings;
}

export function getDefaultSetting(
  script: string,
  settingName: string,
): number | string | boolean | undefined {
  const mode = getGameModeByScript(script);
  if (!mode) {
    throw new Error(`Game mode with script ${script} not found.`);
  }

  const setting = mode.ParamDescs.find((param) => param.Name === settingName);

  if (!setting) {
    return undefined;
  }

  return getNormalizedSetting(setting.Default, setting.Type);
}

export function generateScript(
  script: string,
  settings: Record<
    string,
    {
      value?: string | number | boolean;
      type: "string" | "int" | "float" | "boolean";
    }
  >,
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

export function getNormalizedSetting(
  value: string,
  type: string,
): string | number | boolean | undefined {
  switch (type) {
    case "int":
      return parseInt(value, 10);
    case "float":
      return parseFloat(value);
    case "boolean":
      return value.toLowerCase() === "true";
    case "string":
      return value;
    default:
      return undefined;
  }
}
