import { serverPermissions } from "@gcp/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  call: vi.fn(),
  multicall: vi.fn(),
  setScriptName: vi.fn(),
  setScriptSettings: vi.fn(),
  setPaused: vi.fn(),
  loadMatchSettings: vi.fn(),
  addMaps: vi.fn(),
  getFileManager: vi.fn(),
  downloadTMXMap: vi.fn(),
  setPlayerPoints: vi.fn(),
  setTeamPoints: vi.fn(),
  sendChat: vi.fn(),
  reloadPlugins: vi.fn(),
  publishServerEvent: vi.fn(),
  dbFindPlugin: vi.fn(),
  dbUpdatePlugin: vi.fn(),
  dbUpdateServer: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    serverPlugins: {
      findUnique: mocks.dbFindPlugin,
      update: mocks.dbUpdatePlugin,
    },
    servers: { update: mocks.dbUpdateServer },
  }),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
  getLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/redis", () => ({
  getKeyJukebox: (id: string) => `jukebox:${id}`,
  getRedisClient: async () => ({}),
}));
vi.mock("@/lib/gbx-service", () => ({
  getGbxClient: () => ({ call: mocks.call, multicall: mocks.multicall }),
  gbxService: {
    setScriptName: mocks.setScriptName,
    setScriptSettings: mocks.setScriptSettings,
    setPaused: mocks.setPaused,
    loadMatchSettings: mocks.loadMatchSettings,
    addMaps: mocks.addMaps,
    setPlayerPoints: mocks.setPlayerPoints,
    setTeamPoints: mocks.setTeamPoints,
    sendChat: mocks.sendChat,
    reloadPlugins: mocks.reloadPlugins,
  },
  publishServerEvent: mocks.publishServerEvent,
}));
vi.mock("@/lib/managers/file-manager", () => ({
  getFileManager: mocks.getFileManager,
}));
vi.mock("@/lib/api/tmx", () => ({ downloadTMXMap: mocks.downloadTMXMap }));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: mocks.audit,
}));

import {
  createEntryAs,
  deleteEntriesAs,
  moveEntriesAs,
  readFileBytesAs,
  uploadFilesAs,
} from "@/actions/filemanager/server-only/files";
import { sendChatMessageAs } from "@/actions/gbx/server-only/advanced";
import {
  matchSettingsFileAs,
  nextMapAs,
  pauseMatchAs,
  restartMapAs,
  setModeScriptSettingsAs,
  setScriptNameAs,
  setShowOpponentsAs,
  triggerModeScriptEventAs,
} from "@/actions/gbx/server-only/game";
import {
  addMapAs,
  addMapsAs,
  jumpToMapIndexAs,
  removeFromJukeboxAs,
  reorderMapsAs,
  setJukeboxAs,
} from "@/actions/gbx/server-only/map";
import {
  addGuestAs,
  banPlayerAs,
  blacklistPlayerAs,
  cleanBanListAs,
  cleanPlayerListAs,
  forceSpectatorAs,
  kickPlayerAs,
  playerListFileAs,
  removeGuestAs,
  setPlayerMapPointsAs,
  setPlayerMatchPointsAs,
  setPlayerRoundPointsAs,
  setTeamMapPointsAs,
  setTeamMatchPointsAs,
  setTeamRoundPointsAs,
  unbanPlayerAs,
  unblacklistPlayerAs,
} from "@/actions/gbx/server-only/player";
import {
  saveServerSettingsAs,
  updateServerOptionsAs,
} from "@/actions/gbx/server-only/server";
import {
  setServerPluginAs,
  setServerPluginVariablesAs,
  triggerServerPluginEventAs,
} from "@/actions/gbx/server-only/server-plugin";
import {
  changeMarketplacePluginVersionAs,
  installMarketplacePluginAs,
  reloadServerPluginsAs,
  saveServerPluginConfigAs,
  setServerPluginEnabledAs,
  uninstallServerPluginAs,
} from "@/actions/server-only/plugins";
import {
  addTmxMapToServerAs,
  downloadMapAs,
} from "@/actions/tmx/server-only/maps";
import { type Actor, guestActor } from "@/lib/actor";
import { sessionClaimsSchema } from "@gcp/shared";

const serverId = "server-a";

function moderatorActor(): Actor {
  const claims = sessionClaimsSchema.parse({
    id: "user-1",
    login: "mod",
    displayName: "Mod",
    admin: false,
    permissions: serverPermissions.moderator.map((p) =>
      p.replace("id", serverId),
    ),
  });
  return {
    userId: "user-1",
    login: "mod",
    displayName: "Mod",
    claims,
  };
}

function adminActor(): Actor {
  const claims = sessionClaimsSchema.parse({
    id: "admin-1",
    login: "adm",
    displayName: "Adm",
    admin: false,
    permissions: serverPermissions.admin.map((p) => p.replace("id", serverId)),
  });
  return {
    userId: "admin-1",
    login: "adm",
    displayName: "Adm",
    claims,
  };
}

describe("actor-based cores", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a guest without touching the GBX service", async () => {
    const guest = guestActor("x");
    const calls: Array<() => Promise<unknown>> = [
      () => restartMapAs(guest, serverId),
      () => nextMapAs(guest, serverId),
      () => setScriptNameAs(guest, serverId, "TM_TimeAttack_Online.Script.txt"),
      () => setModeScriptSettingsAs(guest, serverId, { S_Foo: 1 }),
      () => pauseMatchAs(guest, serverId, true),
      () => setShowOpponentsAs(guest, serverId, 1),
      () => matchSettingsFileAs(guest, serverId, "load", "MatchSettings/a.txt"),
      () => triggerModeScriptEventAs(guest, serverId, "Event", []),
      () => jumpToMapIndexAs(guest, serverId, 2),
      () => addMapAs(guest, serverId, "a.Map.Gbx"),
      () => addMapsAs(guest, serverId, ["a.Map.Gbx"]),
      () => reorderMapsAs(guest, serverId, ["a.Map.Gbx"]),
      () => setJukeboxAs(guest, serverId, []),
      () => removeFromJukeboxAs(guest, serverId, "map-1"),
      () => uploadFilesAs(guest, serverId, new FormData()),
      () => readFileBytesAs(guest, serverId, "/UserData/a.txt"),
      () =>
        createEntryAs(guest, serverId, { path: "/UserData/a", isDir: true }),
      () =>
        moveEntriesAs(guest, serverId, {
          items: [{ from: "/UserData/a", to: "/UserData/b" }],
        }),
      () => deleteEntriesAs(guest, serverId, ["/UserData/a"]),
      () => downloadMapAs(guest, serverId, 1),
      () => addTmxMapToServerAs(guest, serverId, 1),
      () => kickPlayerAs(guest, serverId, "p", "r"),
      () => forceSpectatorAs(guest, serverId, "p", 1),
      () => banPlayerAs(guest, serverId, "p", "r"),
      () => unbanPlayerAs(guest, serverId, "p"),
      () => blacklistPlayerAs(guest, serverId, "p"),
      () => unblacklistPlayerAs(guest, serverId, "p"),
      () => addGuestAs(guest, serverId, "p"),
      () => removeGuestAs(guest, serverId, "p"),
      () => cleanBanListAs(guest, serverId),
      () => cleanPlayerListAs(guest, serverId, "blacklist"),
      () =>
        playerListFileAs(guest, serverId, "guestlist", "save", "guests.txt"),
      () => setPlayerRoundPointsAs(guest, serverId, "p", 1),
      () => setPlayerMapPointsAs(guest, serverId, "p", 1),
      () => setPlayerMatchPointsAs(guest, serverId, "p", 1),
      () => setTeamRoundPointsAs(guest, serverId, 0, 1),
      () => setTeamMapPointsAs(guest, serverId, 0, 1),
      () => setTeamMatchPointsAs(guest, serverId, 0, 1),
      () => setServerPluginEnabledAs(guest, serverId, "plugin", true),
      () => saveServerPluginConfigAs(guest, serverId, "plugin", {}),
      () => reloadServerPluginsAs(guest, serverId),
      () => installMarketplacePluginAs(guest, serverId, "x", "1.0.0", []),
      () => changeMarketplacePluginVersionAs(guest, serverId, "p", "1.0.0", []),
      () => uninstallServerPluginAs(guest, serverId, "p"),
      () => setServerPluginAs(guest, serverId, false, "x", {}),
      () => setServerPluginVariablesAs(guest, serverId, {}),
      () => triggerServerPluginEventAs(guest, serverId, "x", []),
      () => updateServerOptionsAs(guest, serverId, { Name: "Other" }),
      () => saveServerSettingsAs(guest, serverId, {} as never),
      () => sendChatMessageAs(guest, serverId, "hi"),
    ];
    for (const call of calls) {
      await expect(call()).rejects.toMatchObject({ name: "Unauthorized" });
    }
    expect(mocks.call).not.toHaveBeenCalled();
    expect(mocks.setScriptName).not.toHaveBeenCalled();
    expect(mocks.setScriptSettings).not.toHaveBeenCalled();
    expect(mocks.setPaused).not.toHaveBeenCalled();
    expect(mocks.loadMatchSettings).not.toHaveBeenCalled();
    expect(mocks.addMaps).not.toHaveBeenCalled();
    expect(mocks.getFileManager).not.toHaveBeenCalled();
    expect(mocks.downloadTMXMap).not.toHaveBeenCalled();
    expect(mocks.setPlayerPoints).not.toHaveBeenCalled();
    expect(mocks.setTeamPoints).not.toHaveBeenCalled();
    expect(mocks.sendChat).not.toHaveBeenCalled();
    expect(mocks.reloadPlugins).not.toHaveBeenCalled();
    expect(mocks.publishServerEvent).not.toHaveBeenCalled();
    expect(mocks.dbFindPlugin).not.toHaveBeenCalled();
    expect(mocks.dbUpdatePlugin).not.toHaveBeenCalled();
    expect(mocks.dbUpdateServer).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("nextMapAs calls the GBX service and audits with the actor", async () => {
    await nextMapAs(moderatorActor(), serverId);
    expect(mocks.call).toHaveBeenCalledWith("NextMap");
    expect(mocks.audit).toHaveBeenCalledWith(
      "user-1",
      serverId,
      "server.game.map.next",
    );
  });

  it("setScriptNameAs calls the GBX service and audits with the actor", async () => {
    await setScriptNameAs(moderatorActor(), serverId, "Script.txt");
    expect(mocks.setScriptName).toHaveBeenCalledWith(serverId, "Script.txt");
    expect(mocks.audit).toHaveBeenCalledWith(
      "user-1",
      serverId,
      "server.game.script.edit",
      "Script.txt",
    );
  });

  it("kickPlayerAs calls the GBX service and audits with the actor", async () => {
    await kickPlayerAs(moderatorActor(), serverId, "player", "afk");
    expect(mocks.call).toHaveBeenCalledWith("Kick", "player", "afk");
    expect(mocks.audit).toHaveBeenCalledWith(
      "user-1",
      serverId,
      "server.players.kick",
      { login: "player", reason: "afk" },
    );
  });

  it("playerListFileAs picks the list's method and audits the file", async () => {
    await playerListFileAs(
      moderatorActor(),
      serverId,
      "guestlist",
      "load",
      "lists/guests.txt",
    );
    expect(mocks.call).toHaveBeenCalledWith(
      "LoadGuestList",
      "lists/guests.txt",
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      "user-1",
      serverId,
      "server.players.guestlist.load",
      "lists/guests.txt",
    );
  });

  it("playerListFileAs rejects a traversing filename before calling the server", async () => {
    await expect(
      playerListFileAs(
        moderatorActor(),
        serverId,
        "blacklist",
        "save",
        "../blacklist.txt",
      ),
    ).rejects.toMatchObject({ name: "ValidationError" });
    expect(mocks.call).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("cleanPlayerListAs empties the named list", async () => {
    await cleanPlayerListAs(moderatorActor(), serverId, "blacklist");
    expect(mocks.call).toHaveBeenCalledWith("CleanBlackList");
    expect(mocks.audit).toHaveBeenCalledWith(
      "user-1",
      serverId,
      "server.players.blacklist.clear",
    );
  });

  it.each([
    ["load", "server.game.matchsettings.load"],
    ["save", "server.game.matchsettings.save"],
    ["append", "server.game.playlist.append"],
    ["insert", "server.game.playlist.insert"],
  ] as const)(
    "matchSettingsFileAs %s keeps the panel's audit action",
    async (operation, action) => {
      await matchSettingsFileAs(
        moderatorActor(),
        serverId,
        operation,
        "MatchSettings/a.txt",
      );
      expect(mocks.audit).toHaveBeenCalledWith(
        "user-1",
        serverId,
        action,
        "MatchSettings/a.txt",
      );
    },
  );

  it("plugin changes need a server admin, not a moderator", async () => {
    // moderatorActor() holds every role that counts as moderator, admin included
    const mod: Actor = {
      ...moderatorActor(),
      claims: sessionClaimsSchema.parse({
        id: "user-1",
        login: "mod",
        displayName: "Mod",
        admin: false,
        permissions: [`servers:${serverId}:moderator`],
      }),
    };
    for (const call of [
      () => installMarketplacePluginAs(mod, serverId, "x", "1.0.0", []),
      () => uninstallServerPluginAs(mod, serverId, "p"),
      () => setServerPluginAs(mod, serverId, false, "x", {}),
    ]) {
      await expect(call()).rejects.toMatchObject({ name: "Unauthorized" });
    }
    expect(mocks.call).not.toHaveBeenCalled();
  });

  it("changeMarketplacePluginVersionAs refuses a private upload", async () => {
    mocks.dbFindPlugin.mockResolvedValue({
      plugin: { name: "mine", source: "upload" },
      version: { version: "1.0.0", manifest: {}, yanked: false },
    });
    await expect(
      changeMarketplacePluginVersionAs(
        adminActor(),
        serverId,
        "p",
        "2.0.0",
        [],
      ),
    ).rejects.toMatchObject({ name: "PluginNotFromMarketplace" });
    expect(mocks.dbUpdatePlugin).not.toHaveBeenCalled();
  });

  it("setServerPluginEnabledAs updates the plugin and audits with the actor", async () => {
    mocks.dbFindPlugin.mockResolvedValue({
      plugin: { name: "demo", source: "marketplace" },
      version: { version: "1.0.0", manifest: {}, yanked: false },
    });
    await setServerPluginEnabledAs(adminActor(), serverId, "plugin-1", true);
    expect(mocks.dbUpdatePlugin).toHaveBeenCalledWith({
      where: { serverId_pluginId: { serverId, pluginId: "plugin-1" } },
      data: { enabled: true },
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      "admin-1",
      serverId,
      "server.plugins.enable",
      { slug: "demo" },
    );
  });
});

describe("Codriver server options", () => {
  it("preserves passwords and unrelated options and audits only requested changes", async () => {
    vi.clearAllMocks();
    mocks.multicall.mockResolvedValue([
      {
        Name: "Old",
        Comment: "Comment",
        Password: "private",
        PasswordForSpectator: "spectators",
        CurrentCallVoteTimeOut: 30000,
        CallVoteRatio: 0.6,
        NextMaxPlayers: 32,
        NextMaxSpectators: 16,
        AutoSaveReplays: false,
      },
      0,
      true,
      false,
      true,
    ]);
    mocks.call.mockResolvedValue(true);
    await updateServerOptionsAs(adminActor(), serverId, { Name: "New" });
    expect(mocks.call).toHaveBeenCalledWith(
      "SetServerOptions",
      expect.objectContaining({
        Name: "New",
        Password: "private",
        PasswordForSpectator: "spectators",
        NextMaxPlayers: 32,
        CallVoteRatio: 0.6,
        KeepPlayerSlots: true,
        DisableServiceAnnounces: true,
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      "admin-1",
      serverId,
      "server.settings.edit",
      { Name: "New" },
    );
    mocks.call.mockResolvedValue(false);
    await expect(
      updateServerOptionsAs(adminActor(), serverId, { Name: "New" }),
    ).rejects.toThrow("Failed to save");
  });
});
