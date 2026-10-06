import type { ScoresPlayer, SpectatorStatus } from "@gcp/shared";

// Reverse cup / cup point thresholds as used by the Nadeo mode scripts
// Points may be unknown before the first scores callback; unknown never matches
export function isFinalist(matchPoints: number | undefined, pointsLimit?: number): boolean {
  if (pointsLimit === undefined || matchPoints === undefined) return false;
  return matchPoints == pointsLimit;
}

export function isLastChance(matchPoints: number | undefined): boolean {
  if (matchPoints === undefined) return false;
  return -2000 < matchPoints && matchPoints <= -1000;
}

export function isEliminated(matchPoints: number | undefined): boolean {
  if (matchPoints === undefined) return false;
  return -10000 < matchPoints && matchPoints <= -2000;
}

export function isWinner(matchPoints: number | undefined, pointsLimit?: number): boolean {
  if (pointsLimit === undefined || matchPoints === undefined) return false;
  return matchPoints > pointsLimit;
}

export function getSpectatorStatus(spectatorStatus: number): SpectatorStatus {
  return {
    spectator: spectatorStatus % 10 === 1,
    temporarySpectator: Math.floor(spectatorStatus / 10) % 10 === 1,
    pureSpectator: Math.floor(spectatorStatus / 100) % 10 === 1,
    autoTarget: Math.floor(spectatorStatus / 1000) % 10 === 1,
    currentTargetId: Math.floor(spectatorStatus / 10000),
  };
}

// Orders players by race time (DNF last), tie-broken by checkpoints from last to first
export function rankPlayers(
  players: ScoresPlayer[],
  timeAttack?: boolean,
): (ScoresPlayer & { position: number })[] {
  return [...players]
    .sort((a, b) => {
      const timeA = timeAttack ? a.bestracetime : a.prevracetime;
      const timeB = timeAttack ? b.bestracetime : b.prevracetime;

      if (timeA === -1 && timeB === -1) return 0;
      if (timeA === -1) return 1;
      if (timeB === -1) return -1;
      if (timeA !== timeB) return timeA - timeB;

      const cpA = timeAttack ? a.bestracecheckpoints : a.prevracecheckpoints;
      const cpB = timeAttack ? b.bestracecheckpoints : b.prevracecheckpoints;
      for (let i = Math.min(cpA.length, cpB.length) - 1; i >= 0; i--) {
        if (cpA[i] !== cpB[i]) return cpA[i] - cpB[i];
      }
      return 0;
    })
    .map((player, index) => ({ ...player, position: index + 1 }));
}

export interface TeamColors {
  mainColor: string;
  secondaryColor: string;
  textColor: string;
}

const teamColors: Record<string, TeamColors> = {
  red: { mainColor: "A22", secondaryColor: "922", textColor: "DDD" },
  blue: { mainColor: "22A", secondaryColor: "229", textColor: "DDD" },
  default: { mainColor: "", secondaryColor: "", textColor: "" },
};

export function getTeamColors(teamName?: string): TeamColors {
  if (!teamName) return teamColors.default;
  return teamColors[teamName.toLowerCase()] ?? teamColors.default;
}
