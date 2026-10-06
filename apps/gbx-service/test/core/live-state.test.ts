import { describe, expect, it } from "vitest";
import { LiveState } from "../../src/core/live/live-state";
import { player } from "../fakes/harness";

describe("LiveState", () => {
  it("upserts and removes active players", () => {
    const state = new LiveState();
    state.upsertActivePlayer({ login: "a", nickName: "A", playerId: 1, spectatorStatus: 0, teamId: 0 });
    state.upsertActivePlayer({ login: "a", nickName: "A2", playerId: 1, spectatorStatus: 0, teamId: 0 });
    expect(state.activePlayers).toHaveLength(1);
    expect(state.activePlayers[0].nickName).toBe("A2");

    state.removeActivePlayer("a");
    expect(state.activePlayers).toHaveLength(0);
  });

  it("patches players without dropping existing fields", () => {
    const state = new LiveState();
    state.patchPlayer("a", { login: "a", matchPoints: 10 });
    state.patchPlayer("a", { roundPoints: 3 });
    expect(state.getPlayerRound("a")).toMatchObject({ login: "a", matchPoints: 10, roundPoints: 3 });
  });

  it("reports reverse cup status only in reverse cup", () => {
    const state = new LiveState();
    state.patchPlayer("a", { matchPoints: -10000 });
    expect(state.reverseCupGetPlayerStatus("a").spectator).toBe(false);

    state.liveInfo.type = "reversecup";
    expect(state.reverseCupGetPlayerStatus("a").spectator).toBe(true);
    state.patchPlayer("a", { matchPoints: -2500 });
    expect(state.reverseCupGetPlayerStatus("a")).toEqual({
      spectator: false,
      eliminated: true,
      lastChance: false,
    });
  });

  it("picks the reverse cup repartition by player count and fast-forwards", () => {
    const state = new LiveState();
    state.liveInfo.type = "reversecup";
    state.liveInfo.pointsRepartition = [1, 2];
    state.liveInfo.pointsRepartitionMap = { 3: [3, 6, 10] };

    expect(state.reverseCupGetPointsRepartition(3)).toEqual([3, 6, 10]);
    expect(state.reverseCupGetPointsRepartition(4)).toEqual([1, 2]);

    state.liveInfo.fastForwardPointsRepartition = true;
    state.liveInfo.pointsRepartition = [1, 2, 3, 4];
    state.patchPlayer("out", { matchPoints: -2500 });
    expect(state.reverseCupGetPointsRepartition(5)).toEqual([2, 3, 4]);
  });

  it("rebuilds the active round from racing players only", () => {
    const state = new LiveState();
    state.liveInfo.pointsLimit = 50;
    state.patchPlayer("finalist", { matchPoints: 50, accountId: "acc" });

    state.resetActiveRound([
      player("finalist"),
      player("spec", { SpectatorStatus: 1 }),
      player("unknown"),
    ]);

    expect(Object.keys(state.liveInfo.activeRound.players)).toEqual(["finalist", "unknown"]);
    expect(state.liveInfo.activeRound.players.finalist).toMatchObject({
      accountId: "acc",
      isFinalist: true,
      checkpoint: 0,
    });
    expect(state.liveInfo.activeRound.players.unknown.accountId).toBe("");
  });

  it("applies parsed settings but keeps repartition when none is provided", () => {
    const state = new LiveState();
    state.liveInfo.pointsRepartition = [5];
    state.applyScriptSettings({
      pointsLimit: 10,
      roundsLimit: 2,
      mapLimit: 1,
      nbWinners: 1,
      fastForwardPointsRepartition: false,
    });
    expect(state.liveInfo.pointsLimit).toBe(10);
    expect(state.liveInfo.pointsRepartition).toEqual([5]);
  });
});
