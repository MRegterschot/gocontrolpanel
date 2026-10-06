import { GAME_MODE_TYPES, GameModeType } from "@gcp/shared";
import type { Logger } from "../logger";

// Order matters: "reversecup" must be matched before "cup"
export function detectModeType(scriptName: string): GameModeType {
  const lower = scriptName.toLowerCase();
  return GAME_MODE_TYPES.find((type) => lower.includes(type)) ?? "rounds";
}

export interface ParsedScriptSettings {
  pointsLimit: number;
  roundsLimit: number;
  mapLimit: number;
  nbWinners: number;
  pointsRepartition?: number[];
  pointsRepartitionMap?: Record<number, number[]>;
  fastForwardPointsRepartition: boolean;
}

const DEFAULT_POINTS_REPARTITION = [10, 6, 4, 3, 2, 1];

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
}

// Example: {"3": [3, 6, 10], "4,5": [1, 3, 6, 10]}
export function parseComplexPointsRepartition(
  raw: string,
): Record<number, number[]> {
  const parsed = JSON.parse(raw) as Record<string, unknown[]>;
  const result: Record<number, number[]> = {};

  for (const [key, points] of Object.entries(parsed)) {
    const playerCounts = key
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x));
    const pointsArray = points.map((x) => parseInt(String(x), 10));
    for (const count of playerCounts) result[count] = pointsArray;
  }

  return result;
}

// Teams mode without custom repartition: points count down from min(players, max points)
export function teamsPointsRepartition(
  maxPointsPerRound: number,
  rankingSize: number,
): number[] {
  const length = isNaN(maxPointsPerRound)
    ? rankingSize
    : Math.min(rankingSize, maxPointsPerRound);
  return Array.from({ length }, (_, i) => length - i);
}

export function needsRankingForRepartition(
  type: GameModeType | "",
  settings: Record<string, unknown>,
): boolean {
  return type === "teams" && !settings["S_UseCustomPointsRepartition"];
}

export function parseScriptSettings(
  type: GameModeType | "",
  settings: Record<string, unknown>,
  rankingSize = 0,
  log?: Logger,
): ParsedScriptSettings {
  let pointsLimitVar = "S_PointsLimit";
  let mapLimitVar = "S_MapsPerMatch";
  let repartitionVar = "S_PointsRepartition";

  if (type === "tmwc" || type === "tmwt") {
    pointsLimitVar = "S_MapPointsLimit";
    mapLimitVar = "S_MatchPointsLimit";
  }
  if (type === "knockout") {
    repartitionVar = "S_EliminatedPlayersNbRanks";
  }

  const result: ParsedScriptSettings = {
    pointsLimit: toNumber(settings[pointsLimitVar], 0),
    roundsLimit: toNumber(settings["S_RoundsPerMap"], 0),
    mapLimit: toNumber(settings[mapLimitVar], 0),
    nbWinners: toNumber(settings["S_NbOfWinners"], 1),
    fastForwardPointsRepartition: !!settings["S_FastForwardPointsRepartition"],
  };

  if (type === "reversecup") {
    const complex = settings["S_ComplexPointsRepartition"];
    if (typeof complex === "string" && complex) {
      try {
        result.pointsRepartitionMap = parseComplexPointsRepartition(complex);
      } catch (error) {
        log?.error({ err: error }, "Failed to parse complex points repartition");
      }
    }
  }

  const repartition = settings[repartitionVar];
  if (typeof repartition === "string") {
    result.pointsRepartition = repartition
      ? repartition
          .split(",")
          .map((x) => parseInt(x.trim(), 10))
          .filter((x) => !isNaN(x))
      : DEFAULT_POINTS_REPARTITION;
  }

  if (needsRankingForRepartition(type, settings)) {
    result.pointsRepartition = teamsPointsRepartition(
      Number(settings["S_MaxPointsPerRound"]),
      rankingSize,
    );
  }

  return result;
}
