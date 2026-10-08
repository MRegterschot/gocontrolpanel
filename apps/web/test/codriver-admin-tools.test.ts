import { sessionClaimsSchema } from "@gcp/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  liveState: vi.fn(),
  actorForLogin: vi.fn(),
  gbxCall: vi.fn(),
  findUsers: vi.fn(),
  findServerPlugins: vi.fn(),
  kick: vi.fn(),
  ban: vi.fn(),
  unban: vi.fn(),
  teamMatchPoints: vi.fn(),
  setEnabled: vi.fn(),
  saveConfig: vi.fn(),
  updateOptions: vi.fn(),
  sendChat: vi.fn(),
  emitPluginEvent: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  getLogger: () => ({ warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/lib/codriver/state", () => ({ getLiveState: mocks.liveState }));
vi.mock("@/lib/actor", async (original) => ({
  ...(await original<typeof import("@/lib/actor")>()),
  actorForLogin: mocks.actorForLogin,
}));
vi.mock("@/lib/gbx-service", () => ({
  getGbxClient: () => ({ call: mocks.gbxCall }),
  gbxService: { emitPluginEvent: mocks.emitPluginEvent },
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    users: { findMany: mocks.findUsers },
    serverPlugins: { findMany: mocks.findServerPlugins },
  }),
}));
vi.mock("@/services/plugins", () => ({
  storedManifest: (raw: unknown) => raw,
}));
vi.mock("@/actions/gbx/server-only/player", () => ({
  kickPlayerAs: mocks.kick,
  banPlayerAs: mocks.ban,
  unbanPlayerAs: mocks.unban,
  setTeamMatchPointsAs: mocks.teamMatchPoints,
  forceSpectatorAs: vi.fn(),
  blacklistPlayerAs: vi.fn(),
  unblacklistPlayerAs: vi.fn(),
  addGuestAs: vi.fn(),
  removeGuestAs: vi.fn(),
  setPlayerRoundPointsAs: vi.fn(),
  setPlayerMapPointsAs: vi.fn(),
  setPlayerMatchPointsAs: vi.fn(),
  setTeamRoundPointsAs: vi.fn(),
  setTeamMapPointsAs: vi.fn(),
}));
vi.mock("@/actions/server-only/plugins", () => ({
  setServerPluginEnabledAs: mocks.setEnabled,
  saveServerPluginConfigAs: mocks.saveConfig,
  reloadServerPluginsAs: vi.fn(),
}));
vi.mock("@/actions/gbx/server-only/server", () => ({
  updateServerOptionsAs: mocks.updateOptions,
}));
vi.mock("@/actions/gbx/server-only/advanced", () => ({
  sendChatMessageAs: mocks.sendChat,
}));

import { guestActor, type Actor } from "@/lib/actor";
import { codriverTools } from "@/lib/codriver/registry";
import { executeCalls, runCodriver } from "@/lib/codriver/runner";
import {
  banPlayer,
  forceSpectator,
  kickPlayer,
  playerTools,
  setPoints,
  unbanPlayer,
} from "@/lib/codriver/tools/players";
import {
  setPluginConfig,
  setPluginEnabled,
} from "@/lib/codriver/tools/plugins";
import { announce, setServerSettings } from "@/lib/codriver/tools/server";
import type { ToolContext } from "@/lib/codriver/types";

const serverId = "server-a";

function actor(
  login: string,
  role: "Admin" | "Moderator" | null,
  panelAdmin = false,
): Actor {
  return {
    userId: `id-${login}`,
    login,
    displayName: login,
    claims: sessionClaimsSchema.parse({
      id: `id-${login}`,
      login,
      admin: panelAdmin,
      servers: role ? [{ id: serverId, name: "A", role }] : [],
    }),
  };
}

const admin = actor("admin", "Admin");
const ctx: ToolContext = { serverId, actor: admin, role: "admin" };

beforeEach(() => {
  mocks.liveState.mockResolvedValue({
    players: [
      { login: "bob-login", nickName: "Bob", spectator: false },
      { login: "boss-login", nickName: "The Boss", spectator: false },
      { login: "carl-login", nickName: "Carl", spectator: false },
    ],
  });
  mocks.actorForLogin.mockImplementation(async (login: string) =>
    login === "boss-login" ? actor(login, null, true) : guestActor(login),
  );
  mocks.findUsers.mockResolvedValue([]);
  mocks.emitPluginEvent.mockResolvedValue(null);
});

describe("player tools", () => {
  it("allow moderators to kick and spectate, reserving other tools for admins", () => {
    expect(kickPlayer.minRole).toBe("moderator");
    expect(forceSpectator.minRole).toBe("moderator");
    for (const tool of playerTools.filter(
      (t) => ![kickPlayer, forceSpectator].includes(t),
    )) {
      expect(tool.minRole).toBe("admin");
    }
  });

  it("kick the matched online player", async () => {
    const result = await kickPlayer.run(ctx, { player: "bob" });
    expect(mocks.kick).toHaveBeenCalledWith(admin, serverId, "bob-login", "");
    expect(result.reply).toBe("Kicked Bob.");
  });

  it("refuse to act on a panel admin for a server admin", async () => {
    await expect(banPlayer.run(ctx, { player: "the boss" })).rejects.toThrow(
      "You can't do that to The Boss.",
    );
    expect(mocks.ban).not.toHaveBeenCalled();
  });

  it("let a panel admin act on another panel admin", async () => {
    const panelAdmin = actor("root", null, true);
    await kickPlayer.run(
      { serverId, actor: panelAdmin, role: "admin" },
      { player: "the boss" },
    );
    expect(mocks.kick).toHaveBeenCalled();
  });

  it("ask which player when the name is ambiguous", async () => {
    mocks.liveState.mockResolvedValue({
      players: [
        { login: "a", nickName: "Bob One", spectator: false },
        { login: "b", nickName: "Bob Two", spectator: false },
      ],
    });
    await expect(kickPlayer.run(ctx, { player: "bob" })).rejects.toThrow(
      "Which player",
    );
  });

  it("find offline players on the ban list for unban", async () => {
    mocks.gbxCall.mockResolvedValue([{ Login: "old-login" }]);
    mocks.findUsers.mockResolvedValue([
      { login: "old-login", nickName: "Oldie" },
    ]);
    await unbanPlayer.run(ctx, { player: "oldie" });
    expect(mocks.gbxCall).toHaveBeenCalledWith("GetBanList", 1000, 0);
    expect(mocks.unban).toHaveBeenCalledWith(admin, serverId, "old-login");
  });

  it("set team points by colour", async () => {
    await setPoints.run(ctx, {
      who: "Red",
      target: "team",
      scope: "match",
      points: 5,
    });
    expect(mocks.teamMatchPoints).toHaveBeenCalledWith(admin, serverId, 1, 5);
    await expect(
      setPoints.run(ctx, {
        who: "green",
        target: "team",
        scope: "match",
        points: 5,
      }),
    ).rejects.toThrow('"blue" or "red"');
  });
});

describe("plugin tools", () => {
  beforeEach(() => {
    mocks.findServerPlugins.mockResolvedValue([
      {
        pluginId: "p1",
        enabled: false,
        config: { secretKey: "kept", interval: 5 },
        plugin: { name: "live-round", displayName: "Live Round" },
        version: {
          manifest: {
            configSchema: {
              type: "object",
              properties: {
                interval: {
                  type: "integer",
                  title: "Update interval",
                  minimum: 1,
                  maximum: 60,
                },
                showFlags: { type: "boolean", title: "Show flags" },
                secretKey: { type: "string", title: "API key", secret: true },
              },
            },
          },
        },
      },
      {
        pluginId: "p2",
        enabled: true,
        config: {},
        plugin: { name: "live-ranking", displayName: null },
        version: null,
      },
    ]);
  });

  it("turn the matched plugin on", async () => {
    const result = await setPluginEnabled.run(ctx, {
      plugin: "the live round plugin",
      enabled: true,
    });
    expect(mocks.setEnabled).toHaveBeenCalledWith(admin, serverId, "p1", true);
    expect(result.reply).toBe("Live Round is now on.");
  });

  it("say when nothing changes", async () => {
    const result = await setPluginEnabled.run(ctx, {
      plugin: "live ranking",
      enabled: true,
    });
    expect(mocks.setEnabled).not.toHaveBeenCalled();
    expect(result.reply).toContain("already on");
  });

  it("change settings by title, converted to the field's type, keeping the rest", async () => {
    await setPluginConfig.run(ctx, {
      plugin: "live round",
      settings: [
        { name: "update interval", value: "10" },
        { name: "show flags", value: "off" },
      ],
    });
    expect(mocks.saveConfig).toHaveBeenCalledWith(admin, serverId, "p1", {
      secretKey: "kept",
      interval: 10,
      showFlags: false,
    });
  });

  it("rejects schema constraints before confirmation", async () => {
    await expect(
      setPluginConfig.prepare!(ctx, {
        plugin: "live round",
        settings: [{ name: "interval", value: 100 }],
      }),
    ).rejects.toThrow("invalid");
    expect(mocks.saveConfig).not.toHaveBeenCalled();
  });

  it("binds plugin configuration to the installed plugin id", async () => {
    const prepared = await setPluginConfig.prepare!(ctx, {
      plugin: "live round",
      settings: [{ name: "interval", value: 10 }],
    });
    expect(prepared).toMatchObject({ plugin: "id:p1" });
    mocks.findServerPlugins.mockResolvedValue([
      {
        pluginId: "replacement",
        enabled: true,
        plugin: { name: "live-round" },
        config: {},
        version: null,
      },
    ]);
    await expect(setPluginConfig.run(ctx, prepared)).rejects.toThrow(
      "no longer installed",
    );
    expect(mocks.saveConfig).not.toHaveBeenCalled();
  });

  it("never set secret fields", async () => {
    await expect(
      setPluginConfig.run(ctx, {
        plugin: "live round",
        settings: [{ name: "api key", value: "stolen" }],
      }),
    ).rejects.toThrow("no setting");
    expect(mocks.saveConfig).not.toHaveBeenCalled();
  });
});

describe("server tools", () => {
  it("change only the options asked for", async () => {
    await setServerSettings.run(ctx, { name: "Cup Night", max_players: 32 });
    expect(mocks.updateOptions).toHaveBeenCalledWith(admin, serverId, {
      Name: "Cup Night",
      NextMaxPlayers: 32,
    });
  });

  it("need at least one option", () => {
    expect(() => setServerSettings.confirm!(ctx, {})).toThrow(
      "Tell me what to change",
    );
  });

  it("escape formatting in announcements", async () => {
    await announce.run(ctx, { message: "$f00Red $wwide" });
    expect(mocks.sendChat).toHaveBeenCalledWith(admin, serverId, "Red wide");
  });
});

describe("codriver:action", () => {
  it("is emitted after a change, not after a read", async () => {
    await executeCalls(
      ctx,
      [{ tool: "kick_player", input: { player: "bob" } }],
      [kickPlayer],
    );
    expect(mocks.emitPluginEvent).toHaveBeenCalledWith(serverId, {
      source: "codriver",
      name: "action",
      payload: {
        tool: "kick_player",
        args: { player: "bob" },
        login: "admin",
      },
    });
  });

  it("is not emitted when the tool fails", async () => {
    await executeCalls(
      ctx,
      [{ tool: "ban_player", input: { player: "the boss" } }],
      [banPlayer],
    );
    expect(mocks.emitPluginEvent).not.toHaveBeenCalled();
  });
});

describe("phase 4 registry and confirmations", () => {
  const model = { plan: vi.fn() };
  const options = { model, primaryModel: "test", escalationModel: null };

  it("lists plugins without a model call or a mutation event", async () => {
    mocks.findServerPlugins.mockResolvedValue([
      {
        pluginId: "p1",
        enabled: true,
        config: {},
        plugin: { name: "demo" },
        version: null,
      },
    ]);
    const result = await runCodriver(
      { serverId, actor: actor("mod", "Moderator"), text: "list plugins" },
      options,
    );
    expect(result).toMatchObject({
      status: "done",
      reply: "demo: on",
      fastPath: true,
    });
    expect(model.plan).not.toHaveBeenCalled();
    expect(mocks.emitPluginEvent).not.toHaveBeenCalled();
  });

  it("registers the player, plugin, server and chat tools", () => {
    expect(codriverTools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        ...playerTools.map((t) => t.name),
        "set_plugin_enabled",
        "set_plugin_config",
        "reload_plugins",
        "list_plugins",
        "set_server_settings",
        "announce",
      ]),
    );
  });

  it("rejects admin tools for moderators before the model is called", async () => {
    const result = await runCodriver(
      { serverId, actor: actor("mod", "Moderator"), text: "enable demo" },
      options,
    );
    expect(result.status).toBe("denied");
    expect(model.plan).not.toHaveBeenCalled();
    expect(mocks.setEnabled).not.toHaveBeenCalled();
  });

  it("keeps the confirmed player's identity when names change", async () => {
    model.plan.mockResolvedValue({
      calls: [{ name: "kick_player", input: { player: "bob" } }],
      text: "",
      stopReason: "tool_use",
      usage: {},
    });
    const outcome = await runCodriver(
      { serverId, actor: admin, text: "kick bob" },
      options,
    );
    expect(outcome.status).toBe("needs_confirmation");
    expect(outcome.calls[0].input).toEqual({ player: "login:bob-login" });
    expect(mocks.kick).not.toHaveBeenCalled();
    mocks.liveState.mockResolvedValue({
      players: [{ login: "carl-login", nickName: "Bob" }],
    });
    const result = await executeCalls(ctx, outcome.calls);
    expect(result.status).toBe("failed");
    expect(mocks.kick).not.toHaveBeenCalled();
  });

  it("returns ambiguity before asking to confirm", async () => {
    mocks.liveState.mockResolvedValue({
      players: [
        { login: "a", nickName: "Bob One" },
        { login: "b", nickName: "Bob Two" },
      ],
    });
    model.plan.mockResolvedValue({
      calls: [{ name: "kick_player", input: { player: "bob" } }],
      text: "",
      stopReason: "tool_use",
      usage: {},
    });
    const outcome = await runCodriver(
      { serverId, actor: admin, text: "kick bob" },
      options,
    );
    expect(outcome.status).toBe("unclear");
    expect(outcome.reply).toContain("Which player");
    expect(mocks.kick).not.toHaveBeenCalled();
  });

  it("does not emit an action event when a plugin is already enabled", async () => {
    mocks.findServerPlugins.mockResolvedValue([
      {
        pluginId: "p1",
        enabled: true,
        config: {},
        plugin: { name: "demo" },
        version: null,
      },
    ]);
    const result = await runCodriver(
      { serverId, actor: admin, text: "enable demo" },
      options,
    );
    expect(result.status).toBe("done");
    expect(mocks.setEnabled).not.toHaveBeenCalled();
    expect(mocks.emitPluginEvent).not.toHaveBeenCalled();
  });

  it("keeps a successful mutation successful if event delivery fails", async () => {
    mocks.emitPluginEvent.mockRejectedValue(new Error("offline"));
    expect(
      (
        await executeCalls(ctx, [
          { tool: "kick_player", input: { player: "bob" } },
        ])
      ).status,
    ).toBe("done");
    expect(mocks.kick).toHaveBeenCalled();
  });

  it("refuses to change a higher-ranked player's points", async () => {
    await expect(
      setPoints.run(ctx, {
        target: "player",
        who: "the boss",
        scope: "match",
        points: 0,
      }),
    ).rejects.toThrow("You can't");
  });
});
