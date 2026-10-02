import { describe, expect, it, vi } from "vitest";
import { definePlugin } from "../../src/core/plugins/sdk";
import { flush } from "../fakes/clock";
import { createHarness, MAP_A, player, pluginRecord, SERVER_ID, serverRecord } from "../fakes/harness";

describe("ServerRuntime connect sequence", () => {
  it("authenticates, enables callbacks and syncs live state", async () => {
    const h = await createHarness({ players: [player("p1")] });
    const methods = h.session.calls.map((c) => c.method);

    expect(h.session.connectedTo).toEqual({ host: "127.0.0.1", port: 5000 });
    expect(h.session.calls[0]).toEqual({ method: "Authenticate", params: ["SuperAdmin", "secret"] });
    expect(methods).toEqual(
      expect.arrayContaining(["SetApiVersion", "EnableCallbacks", "ChatEnableManualRouting"]),
    );
    expect(h.session.scriptCalls.map((c) => c.method)).toEqual(
      expect.arrayContaining(["XmlRpc.EnableCallbacks", "Trackmania.Event.SetCurRaceCheckpointsMode"]),
    );

    const { state } = h.runtime;
    expect(h.runtime.status()).toMatchObject({ serverId: SERVER_ID, name: "Test Server", isConnected: true });
    expect(state.liveInfo.type).toBe("rounds");
    expect(state.liveInfo.pointsLimit).toBe(50);
    expect(state.liveInfo.maps).toEqual(["map-a-uid", "map-b-uid"]);
    expect(state.activeMapUid).toBe(MAP_A.UId);
    expect(state.activePlayers.map((p) => p.login)).toEqual(["p1"]);
    expect(h.maps.maps.get(MAP_A.UId)).toBeDefined();
    expect(h.matches.matches).toHaveLength(1);
    expect(state.currentMatchId).toBe("match-1");
    expect(state.roundNumber).toBe(0);
    expect(h.players.users.get("p1")).toBe("Nick p1");
  });

  it("stores maps that Nadeo doesn't know instead of failing the connect", async () => {
    const h = await createHarness({ configure: () => {} });
    expect(h.maps.maps.get(MAP_A.UId)?.thumbnailUrl).toBeNull();
    expect(h.runtime.isConnected).toBe(true);
  });

  it("emits connect only after the session is fully initialised", async () => {
    const h = await createHarness({ connect: false });
    const connected = vi.fn(() => expect(h.runtime.state.liveInfo.maps.length).toBeGreaterThan(0));
    h.runtime.events.on("connect", connected);
    await h.runtime.start();
    expect(connected).toHaveBeenCalledTimes(1);
  });

  it("schedules a retry and closes the session when authentication fails", async () => {
    const h = await createHarness({
      connect: false,
      configure: (s) =>
        s.respond("Authenticate", () => {
          throw new Error("bad credentials");
        }),
    });
    expect(await h.runtime.start()).toBe(false);
    expect(h.session.disconnected).toBe(true);
    expect(h.runtime.status().isReconnecting).toBe(true);
  });

  it("fails to start for a server that does not exist", async () => {
    const h = await createHarness({ connect: false });
    h.servers.servers.clear();
    expect(await h.runtime.start()).toBe(false);
  });
});

describe("ServerRuntime connection loss", () => {
  it("unloads plugins, emits disconnect and reconnects with a fresh session", async () => {
    const stop = vi.fn();
    const plugin = definePlugin({ id: "probe", create: () => ({ stop }) });
    const h = await createHarness({
      plugins: [plugin],
      server: { plugins: [pluginRecord("probe")] },
    });
    const disconnected = vi.fn();
    const reconnect = vi.fn();
    h.runtime.events.on("disconnect", disconnected);
    h.runtime.events.on("reconnect", reconnect);

    h.session.drop();
    await flush();

    expect(disconnected).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(h.runtime.isConnected).toBe(false);
    expect(reconnect).toHaveBeenCalledWith("try", h.clock.now() + 15_000);

    await h.clock.advance(15_000);
    expect(h.sessions).toHaveLength(2);
    expect(h.runtime.isConnected).toBe(true);
    expect(h.runtime.plugins.loadedIds()).toEqual(["probe"]);
  });

  it("handles every callback exactly once after reconnecting", async () => {
    const h = await createHarness();
    h.session.drop();
    await flush();
    await h.clock.advance(15_000);

    const connects = vi.fn();
    h.runtime.events.on("playerConnect", connects);
    await h.callback("ManiaPlanet.PlayerConnect", ["p9", false]);

    expect(h.session.callbackHandlerCount()).toBe(1);
    expect(connects).toHaveBeenCalledTimes(1);

    // Callbacks from the dead session are ignored
    h.sessions[0].emit("ManiaPlanet.PlayerConnect", ["ghost", false]);
    await flush();
    expect(connects).toHaveBeenCalledTimes(1);
  });

  it("stays offline after a manual disconnect until reconnect() is called", async () => {
    const h = await createHarness();
    await h.runtime.disconnect();

    expect(h.session.disconnected).toBe(true);
    expect(h.runtime.isConnected).toBe(false);
    expect(h.clock.pendingTimers()).toBe(0);

    expect(await h.runtime.reconnect()).toBe(true);
    expect(h.sessions).toHaveLength(2);
  });

  it("stopReconnect() cancels the pending retry", async () => {
    const h = await createHarness();
    h.session.drop();
    await flush();
    const reconnect = vi.fn();
    h.runtime.events.on("reconnect", reconnect);

    h.runtime.stopReconnect();
    expect(reconnect).toHaveBeenCalledWith("stop", null);
    expect(h.runtime.status().isReconnecting).toBe(false);
    expect(h.clock.pendingTimers()).toBe(0);
  });
});

describe("ServerRuntime updates", () => {
  it("reconnects when the connection details change", async () => {
    const h = await createHarness();
    h.servers.add(serverRecord({ host: "10.0.0.2", name: "Renamed" }));

    await h.runtime.applyServerUpdate();

    expect(h.sessions).toHaveLength(2);
    expect(h.session.connectedTo?.host).toBe("10.0.0.2");
    expect(h.runtime.status().name).toBe("Renamed");
  });

  it("keeps the connection for cosmetic changes", async () => {
    const h = await createHarness();
    h.servers.add(serverRecord({ name: "Renamed", enableHelpCommand: false }));

    await h.runtime.applyServerUpdate();

    expect(h.sessions).toHaveLength(1);
    expect(h.runtime.state.enableHelpCommand).toBe(false);
  });

  it("loads plugins that were enabled in the database", async () => {
    const plugin = definePlugin({ id: "probe", create: () => ({}) });
    const h = await createHarness({ plugins: [plugin] });
    expect(h.runtime.plugins.loadedIds()).toEqual([]);

    h.servers.servers.get(SERVER_ID)!.plugins = [pluginRecord("probe")];
    await h.runtime.refreshPlugins();

    expect(h.runtime.plugins.loadedIds()).toEqual(["probe"]);
  });
});
