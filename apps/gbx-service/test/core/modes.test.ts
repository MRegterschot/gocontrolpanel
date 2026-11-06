import { describe, expect, it } from "vitest";
import {
  detectModeType,
  parseComplexPointsRepartition,
  parseScriptSettings,
  teamsPointsRepartition,
} from "../../src/core/live/modes";

describe("detectModeType", () => {
  it.each([
    ["Trackmania/TM_TimeAttack_Online.Script.txt", "timeattack"],
    ["Trackmania/TM_Rounds_Online.Script.txt", "rounds"],
    ["Trackmania/TM_ReverseCup.Script.txt", "reversecup"],
    ["Trackmania/TM_Cup_Online.Script.txt", "cup"],
    ["Trackmania/TM_Teams_Online.Script.txt", "teams"],
    ["Trackmania/TM_Knockout_Online.Script.txt", "knockout"],
    ["Trackmania/TM_TMWC2024.Script.txt", "tmwc"],
    ["Custom/Something.Script.txt", "rounds"],
  ])("%s -> %s", (script, type) => {
    expect(detectModeType(script)).toBe(type);
  });
});

describe("parseScriptSettings", () => {
  it("reads the standard limits", () => {
    const parsed = parseScriptSettings("rounds", {
      S_PointsLimit: 100,
      S_RoundsPerMap: 6,
      S_MapsPerMatch: 3,
      S_NbOfWinners: 2,
      S_PointsRepartition: "10, 6,4",
      S_FastForwardPointsRepartition: true,
    });
    expect(parsed).toEqual({
      pointsLimit: 100,
      roundsLimit: 6,
      mapLimit: 3,
      nbWinners: 2,
      pointsRepartition: [10, 6, 4],
      fastForwardPointsRepartition: true,
    });
  });

  it("falls back to defaults for missing values", () => {
    const parsed = parseScriptSettings("rounds", { S_PointsRepartition: "" });
    expect(parsed.pointsLimit).toBe(0);
    expect(parsed.nbWinners).toBe(1);
    expect(parsed.pointsRepartition).toEqual([10, 6, 4, 3, 2, 1]);
  });

  it("uses the TMWC/TMWT variable names", () => {
    const parsed = parseScriptSettings("tmwt", { S_MapPointsLimit: 2, S_MatchPointsLimit: 4 });
    expect(parsed.pointsLimit).toBe(2);
    expect(parsed.mapLimit).toBe(4);
  });

  it("reads knockout ranks as repartition", () => {
    expect(parseScriptSettings("knockout", { S_EliminatedPlayersNbRanks: "4,16" }).pointsRepartition).toEqual([4, 16]);
  });

  it("parses the complex reverse cup repartition", () => {
    const parsed = parseScriptSettings("reversecup", {
      S_ComplexPointsRepartition: '{"3": [3, 6, 10], "4,5": [1, 3, 6, 10]}',
    });
    expect(parsed.pointsRepartitionMap).toEqual({
      3: [3, 6, 10],
      4: [1, 3, 6, 10],
      5: [1, 3, 6, 10],
    });
  });

  it("ignores an invalid complex repartition", () => {
    expect(
      parseScriptSettings("reversecup", { S_ComplexPointsRepartition: "{nope" }).pointsRepartitionMap,
    ).toBeUndefined();
  });

  it("derives teams repartition from the ranking when not custom", () => {
    expect(parseScriptSettings("teams", { S_MaxPointsPerRound: 3 }, 5).pointsRepartition).toEqual([3, 2, 1]);
    expect(parseScriptSettings("teams", { S_MaxPointsPerRound: 10 }, 4).pointsRepartition).toEqual([4, 3, 2, 1]);
    expect(
      parseScriptSettings("teams", { S_UseCustomPointsRepartition: true, S_PointsRepartition: "5,1" }, 4)
        .pointsRepartition,
    ).toEqual([5, 1]);
  });
});

describe("helpers", () => {
  it("teamsPointsRepartition without a max uses the ranking size", () => {
    expect(teamsPointsRepartition(NaN, 3)).toEqual([3, 2, 1]);
  });

  it("parseComplexPointsRepartition skips invalid player counts", () => {
    expect(parseComplexPointsRepartition('{"x,2": [1]}')).toEqual({ 2: [1] });
  });
});
