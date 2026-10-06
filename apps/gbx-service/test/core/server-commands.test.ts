import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/core/errors";
import { createHarness, serverRecord } from "../fakes/harness";

const announcing = {
  ...serverRecord().chat,
  scriptNameChangeMessage: "Mode: {script}",
  matchSettingsLoadedMessage: "Loaded {filename}",
  scriptSettingsSavedMessage: " Settings saved ",
  mapListChangeMessage: "{count} map(s) {action}: {maps}",
};

const broadcasts = (h: Awaited<ReturnType<typeof createHarness>>) =>
  h.session.callsTo("ChatSendServerMessage").map((c) => c.params[0]);

describe("ServerCommands", () => {
  it("changes the script and announces it", async () => {
    const h = await createHarness({ server: { chat: announcing } });
    await h.runtime.commands.setScriptName("TM_Cup");
    expect(h.session.callsTo("SetScriptName")[0].params).toEqual(["TM_Cup"]);
    expect(broadcasts(h)).toContain("Mode: TM_Cup");
  });

  it("does not announce when no template is configured", async () => {
    const h = await createHarness();
    await h.runtime.commands.loadMatchSettings("tracklist.txt");
    expect(broadcasts(h)).toEqual([]);
  });

  it("saves script settings and triggers the settings echo", async () => {
    const h = await createHarness({ server: { chat: announcing } });
    await h.runtime.commands.setScriptSettings({ S_PointsLimit: 70 });
    expect(h.session.callsTo("SetModeScriptSettings")[0].params).toEqual([{ S_PointsLimit: 70 }]);
    expect(h.session.sent).toContainEqual({ method: "Echo", params: ["", "UpdatedSettings"] });
    expect(broadcasts(h)).toContain("Settings saved");
  });

  it("pauses and rewinds the round counter", async () => {
    const h = await createHarness();
    h.runtime.state.roundNumber = 2;
    await h.runtime.commands.setPaused(true);
    expect(h.session.callsTo("TriggerModeScriptEventArray")[0].params).toEqual([
      "Maniaplanet.Pause.SetActive",
      ["true"],
    ]);
    expect(h.runtime.state.liveInfo.isPaused).toBe(true);
    expect(h.runtime.state.roundNumber).toBe(1);
  });

  it("adds one map with AddMap and many with AddMapList, announcing stripped names", async () => {
    const h = await createHarness({ server: { chat: announcing } });
    expect(await h.runtime.commands.addMaps(["Campaigns/MapB.Map.Gbx"])).toEqual({ count: 1 });
    expect(h.session.callsTo("AddMap")).toHaveLength(1);
    expect(broadcasts(h)).toContain("1 map(s) added: Map B");

    expect(await h.runtime.commands.addMaps(["a", "b"])).toEqual({ count: 2 });
    expect(h.session.callsTo("AddMapList").at(-1)?.params).toEqual([["a", "b"]]);
  });

  it("refuses to remove the last map", async () => {
    const h = await createHarness();
    await expect(
      h.runtime.commands.removeMaps(["Campaigns/MapA.Map.Gbx", "Campaigns/MapB.Map.Gbx"]),
    ).rejects.toMatchObject({ code: "RemoveLastMapError" });
    expect(await h.runtime.commands.removeMaps(["Campaigns/MapB.Map.Gbx"])).toEqual({ count: 1 });
  });

  it("reports a failed map list change", async () => {
    const h = await createHarness({ configure: (s) => s.respond("AddMapList", false) });
    await expect(h.runtime.commands.addMaps(["a", "b"])).rejects.toBeInstanceOf(AppError);
    await expect(h.runtime.commands.reorderMaps(["a"])).rejects.toMatchObject({
      code: "ReorderMapListError",
    });
  });

  it("sets player points and mirrors round/match points in live state", async () => {
    const h = await createHarness();
    const updated = vi.fn();
    h.runtime.events.on("playerUpdated", updated);
    h.runtime.state.patchPlayer("p1", { login: "p1", roundPoints: 1, matchPoints: 5 });

    await h.runtime.commands.setPlayerPoints("p1", "match", 30);
    expect(h.session.scriptCalls.at(-1)).toEqual({
      method: "Trackmania.SetPlayerPoints",
      params: ["p1", "", "", "30"],
    });
    expect(h.runtime.state.getPlayerRound("p1")?.matchPoints).toBe(30);

    // Map points have no live field; round points must stay untouched
    await h.runtime.commands.setPlayerPoints("p1", "map", 7);
    expect(h.session.scriptCalls.at(-1)?.params).toEqual(["p1", "", "7", ""]);
    expect(h.runtime.state.getPlayerRound("p1")?.roundPoints).toBe(1);
    expect(updated).toHaveBeenCalledTimes(2);
  });

  it("sets team points only for known teams", async () => {
    const h = await createHarness();
    const updated = vi.fn();
    h.runtime.events.on("teamUpdated", updated);

    await h.runtime.commands.setTeamPoints(1, "round", 3);
    expect(updated).not.toHaveBeenCalled();

    h.runtime.state.setTeam(1, { id: 1, name: "Red", roundPoints: 0, mapPoints: 0, matchPoints: 0 });
    await h.runtime.commands.setTeamPoints(1, "map", 2);
    expect(h.session.scriptCalls.at(-1)?.params).toEqual(["1", "", "2", ""]);
    expect(updated).toHaveBeenCalledWith(expect.objectContaining({ mapPoints: 2 }));
  });

  it("turns manual routing off when the server refuses it", async () => {
    const h = await createHarness({
      configure: (s) =>
        s.respond("ChatEnableManualRouting", (enabled: boolean) => {
          if (enabled) throw new Error("routing already taken");
          return true;
        }),
    });

    const result = await h.runtime.commands.applyChatConfig({ ...announcing, manualRouting: true });

    expect(result.applied.manualRouting).toBe(false);
    expect(result.error).toContain("routing already taken");
    expect(h.runtime.state.chat?.manualRouting).toBe(false);
  });

  it("keeps manual routing for an offline server instead of treating it as refused", async () => {
    const h = await createHarness();
    await h.runtime.disconnect();

    const result = await h.runtime.commands.applyChatConfig({ ...announcing, manualRouting: true });

    // The stored config is applied when the server connects
    expect(result).toEqual({ applied: { ...announcing, manualRouting: true } });
    expect(h.runtime.state.chat?.manualRouting).toBe(true);
    expect(h.runtime.state.chat?.connectMessage).toBe(announcing.connectMessage);
  });

  it("fails cleanly while disconnected", async () => {
    const h = await createHarness();
    await h.runtime.disconnect();
    await expect(h.runtime.commands.setScriptName("x")).rejects.toMatchObject({
      code: "ServerNotConnected",
    });
  });
});
