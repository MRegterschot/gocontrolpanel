import { describe, expect, it } from "vitest";
import {
  accountIdToLogin,
  getSpectatorStatus,
  getTeamColors,
  loginToAccountId,
  rankPlayers,
  throttle,
  type PluginContext,
  type ScoresPlayer,
} from "../src";

// Pairs produced by slugid, which the service uses for the same conversion
const ACCOUNTS: [string, string][] = [
  ["6f2d5f5c-8b1e-4d4b-9c3e-1a2b3c4d5e6f", "by1fXIseTUucPhorPE1ebw"],
  ["a1b2c3d4-e5f6-4789-abcd-ef0123456789", "obLD1OX2R4mrze8BI0VniQ"],
  ["00000000-0000-0000-0000-000000000000", "AAAAAAAAAAAAAAAAAAAAAA"],
];

describe("account ids", () => {
  it.each(ACCOUNTS)("converts %s", (accountId, login) => {
    expect(accountIdToLogin(accountId)).toBe(login);
    expect(loginToAccountId(login)).toBe(accountId);
  });

  it("has no account for fake players or other logins", () => {
    expect(loginToAccountId("fakeplayer1")).toBeNull();
    expect(loginToAccountId("too-short")).toBeNull();
    expect(accountIdToLogin("not-a-uuid")).toBeNull();
  });
});

describe("helpers", () => {
  it("reads the spectator bit field", () => {
    expect(getSpectatorStatus(2_551_101)).toEqual({
      spectator: true,
      temporarySpectator: false,
      pureSpectator: true,
      autoTarget: true,
      currentTargetId: 255,
    });
  });

  it("colors the red and blue teams", () => {
    expect(getTeamColors("Blue").mainColor).toBe("22A");
    expect(getTeamColors("Green")).toEqual({ mainColor: "", secondaryColor: "", textColor: "" });
  });

  it("ranks by time, then by the latest split, with DNFs last", () => {
    const p = (login: string, time: number, checkpoints: number[]) =>
      ({ login, prevracetime: time, prevracecheckpoints: checkpoints }) as ScoresPlayer;
    const ranked = rankPlayers([
      p("dnf", -1, []),
      p("tieSlow", 900, [400, 900]),
      p("tieFast", 900, [300, 900]),
      p("fast", 800, [300, 800]),
    ]);
    expect(ranked.map((r) => [r.login, r.position])).toEqual([
      ["fast", 1],
      ["tieFast", 2],
      ["tieSlow", 3],
      ["dnf", 4],
    ]);
  });

  it("throttles to one leading and one trailing run", () => {
    const timers: (() => void)[] = [];
    const ctx = { setTimeout: (fn: () => void) => timers.push(fn) } as unknown as PluginContext;
    let runs = 0;
    const run = throttle(ctx, () => runs++, 100);

    run();
    run();
    run();
    expect(runs).toBe(1);
    timers.shift()!();
    expect(runs).toBe(2);
    // The trailing run opened a new window that nothing called into
    timers.shift()!();
    expect(runs).toBe(2);
    run();
    expect(runs).toBe(3);
  });
});
