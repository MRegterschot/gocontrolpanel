import type { ScoresPlayer } from "@tmcp/shared";
import { describe, expect, it } from "vitest";
import {
  getSpectatorStatus,
  getTeamColors,
  isEliminated,
  isFinalist,
  isLastChance,
  isWinner,
  rankPlayers,
} from "../../src/core/live/points";

function scoresPlayer(login: string, prev: number, cps: number[] = []): ScoresPlayer {
  return {
    login,
    accountid: `acc-${login}`,
    name: login,
    team: 0,
    rank: 0,
    roundpoints: 0,
    mappoints: 0,
    matchpoints: 0,
    bestracetime: prev,
    bestracecheckpoints: cps,
    bestlaptime: 0,
    bestlapcheckpoints: [],
    prevracetime: prev,
    prevracecheckpoints: cps,
  };
}

describe("cup thresholds", () => {
  it("detects finalists and winners against the limit", () => {
    expect(isFinalist(100, 100)).toBe(true);
    expect(isFinalist(99, 100)).toBe(false);
    expect(isFinalist(100, undefined)).toBe(false);
    expect(isWinner(101, 100)).toBe(true);
    expect(isWinner(100, 100)).toBe(false);
  });

  it("detects reverse cup last chance and elimination ranges", () => {
    expect(isLastChance(-1000)).toBe(true);
    expect(isLastChance(-1999)).toBe(true);
    expect(isLastChance(-2000)).toBe(false);
    expect(isEliminated(-2000)).toBe(true);
    expect(isEliminated(-9999)).toBe(true);
    expect(isEliminated(-10000)).toBe(false);
  });

  it("treats unknown points as not matching", () => {
    expect(isFinalist(undefined, 10)).toBe(false);
    expect(isEliminated(undefined)).toBe(false);
  });
});

describe("getSpectatorStatus", () => {
  it("decodes the packed digits", () => {
    expect(getSpectatorStatus(2510111)).toEqual({
      spectator: true,
      temporarySpectator: true,
      pureSpectator: true,
      autoTarget: false,
      currentTargetId: 251,
    });
    expect(getSpectatorStatus(0).spectator).toBe(false);
  });
});

describe("rankPlayers", () => {
  it("orders by time with DNF last and checkpoint tie-breaks", () => {
    const ranked = rankPlayers([
      scoresPlayer("dnf", -1),
      scoresPlayer("slow", 3000, [1000, 3000]),
      scoresPlayer("tieB", 2000, [900, 2000]),
      scoresPlayer("tieA", 2000, [800, 2000]),
    ]);
    expect(ranked.map((p) => [p.login, p.position])).toEqual([
      ["tieA", 1],
      ["tieB", 2],
      ["slow", 3],
      ["dnf", 4],
    ]);
  });
});

describe("getTeamColors", () => {
  it("maps known team names case-insensitively", () => {
    expect(getTeamColors("Red").mainColor).toBe("A22");
    expect(getTeamColors("unknown")).toEqual(getTeamColors(undefined));
  });
});
