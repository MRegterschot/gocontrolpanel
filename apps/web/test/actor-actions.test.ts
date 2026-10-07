import { serverPermissions } from "@gcp/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  call: vi.fn(),
  setScriptName: vi.fn(),
  setScriptSettings: vi.fn(),
  setPaused: vi.fn(),
  addMaps: vi.fn(),
  getFileManager: vi.fn(),
  downloadTMXMap: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dbclient", () => ({ getClient: () => ({}) }));
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
  getGbxClient: () => ({ call: mocks.call }),
  gbxService: {
    setScriptName: mocks.setScriptName,
    setScriptSettings: mocks.setScriptSettings,
    setPaused: mocks.setPaused,
    addMaps: mocks.addMaps,
  },
}));
vi.mock("@/lib/managers/file-manager", () => ({
  getFileManager: mocks.getFileManager,
}));
vi.mock("@/lib/api/tmx", () => ({ downloadTMXMap: mocks.downloadTMXMap }));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: mocks.audit,
}));

import { uploadFilesAs } from "@/actions/filemanager/server-only/files";
import {
  nextMapAs,
  pauseMatchAs,
  restartMapAs,
  setModeScriptSettingsAs,
  setScriptNameAs,
} from "@/actions/gbx/server-only/game";
import { addMapAs, jumpToMapIndexAs } from "@/actions/gbx/server-only/map";
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
      () => jumpToMapIndexAs(guest, serverId, 2),
      () => addMapAs(guest, serverId, "a.Map.Gbx"),
      () => uploadFilesAs(guest, serverId, new FormData()),
      () => downloadMapAs(guest, serverId, 1),
      () => addTmxMapToServerAs(guest, serverId, 1),
    ];
    for (const call of calls) {
      await expect(call()).rejects.toMatchObject({ name: "Unauthorized" });
    }
    expect(mocks.call).not.toHaveBeenCalled();
    expect(mocks.setScriptName).not.toHaveBeenCalled();
    expect(mocks.setScriptSettings).not.toHaveBeenCalled();
    expect(mocks.setPaused).not.toHaveBeenCalled();
    expect(mocks.addMaps).not.toHaveBeenCalled();
    expect(mocks.getFileManager).not.toHaveBeenCalled();
    expect(mocks.downloadTMXMap).not.toHaveBeenCalled();
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
});
