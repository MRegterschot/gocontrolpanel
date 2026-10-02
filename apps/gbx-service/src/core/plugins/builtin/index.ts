import type { PluginDefinition } from "../sdk";
import { ecmPlugin } from "./ecm";
import { liveRankingPlugin } from "./live-ranking";
import { liveRoundPlugin } from "./live-round";
import { mapInfoPlugin } from "./map-info";
import { matchPlugin } from "./match";
import { notifyAdminPlugin } from "./notify-admin";
import { playerInfoPlugin } from "./player-info";
import { recordsInfoPlugin } from "./records-info";
import { taActiveRunsPlugin } from "./ta-active-runs";
import { taLeaderboardPlugin } from "./ta-leaderboard";

// Order matches the old PluginManager so widgets layer the same way
export const builtinPlugins: PluginDefinition<any>[] = [
  taLeaderboardPlugin,
  mapInfoPlugin,
  recordsInfoPlugin,
  taActiveRunsPlugin,
  liveRankingPlugin,
  liveRoundPlugin,
  notifyAdminPlugin,
  ecmPlugin,
  playerInfoPlugin,
  matchPlugin,
];
