import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  settings: vi.fn(),
  save: vi.fn(),
  joinLink: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/ratelimiter", () => ({
  takeRateLimitToken: async () => ({ allowed: true, retryAfterMs: 0 }),
}));
vi.mock("@/lib/api-keys/authenticate", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  authenticateApiKey: mocks.authenticate,
}));
vi.mock("@/services/gbx/server", () => ({
  getServerSettingsAs: mocks.settings,
}));
vi.mock("@/services/gbx/advanced", () => ({ getJoinLinkAs: mocks.joinLink }));
vi.mock("@/actions/gbx/server-only/server", () => ({
  saveServerSettingsAs: mocks.save,
}));

import * as joinLinkRoute from "@/app/api/v1/servers/[serverId]/join-link/route";
import * as settingsRoute from "@/app/api/v1/servers/[serverId]/settings/route";
import { actor, onA, principal, req } from "./helpers/public-api";

// The panel form's values: DisableHorns and DisableServiceAnnounces true mean enabled
const form = {
  defaultOptions: {
    Name: "My server",
    Comment: "Welcome",
    Password: "secret",
    PasswordForSpectator: "",
    NextCallVoteTimeOut: 60,
    CallVoteRatio: 50,
    HideServer: 2,
    NextMaxPlayers: 64,
    NextMaxSpectators: 16,
    KeepPlayerSlots: false,
    AutoSaveReplays: true,
    DisableHorns: false,
    DisableServiceAnnounces: true,
  },
  allowMapDownload: true,
  downloadRate: 102400,
  uploadRate: 102400,
  profileSkins: true,
  enableHelpCommand: false,
};

const api = {
  name: "My server",
  comment: "Welcome",
  password: "secret",
  spectatorPassword: "",
  maxPlayers: 64,
  maxSpectators: 16,
  keepPlayerSlots: false,
  visibility: "hiddenFromNations",
  callVoteTimeout: 60,
  callVoteRatio: 50,
  autoSaveReplays: true,
  horns: false,
  serviceAnnounces: true,
  profileSkins: true,
  mapDownload: true,
  downloadRate: 102400,
  uploadRate: 102400,
  helpCommand: false,
};

const patch = (body: unknown) =>
  settingsRoute.PATCH(
    req("/servers/server-a/settings", { method: "PATCH", body }),
    onA(),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue(principal());
  mocks.settings.mockResolvedValue(structuredClone(form));
});

describe("v1 settings", () => {
  it("returns the settings with plain names, passwords included", async () => {
    const res = await settingsRoute.GET(
      req("/servers/server-a/settings"),
      onA(),
    );
    expect(mocks.settings).toHaveBeenCalledWith(actor, "server-a");
    expect(await res.json()).toEqual({ data: api });
  });

  it("changes only the given settings and keeps the rest", async () => {
    const res = await patch({
      name: "Renamed",
      horns: true,
      visibility: "visible",
    });
    expect(res.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith(actor, "server-a", {
      ...form,
      defaultOptions: {
        ...form.defaultOptions,
        Name: "Renamed",
        DisableHorns: true,
        HideServer: 0,
      },
    });
    expect(await res.json()).toEqual({
      data: { ...api, name: "Renamed", horns: true, visibility: "visible" },
    });
  });

  it("can clear a password", async () => {
    await patch({ password: "" });
    expect(mocks.save.mock.calls[0][2].defaultOptions.Password).toBe("");
  });

  it.each([
    ["no changes", {}],
    ["too many players", { maxPlayers: 300 }],
    ["an empty name", { name: "  " }],
    ["a ratio over 100", { callVoteRatio: 101 }],
    ["an unknown visibility", { visibility: "secret" }],
  ])("rejects %s", async (_, body) => {
    const res = await patch(body);
    expect(res.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("needs settings:write to change and settings:read to read", async () => {
    mocks.authenticate.mockResolvedValue(principal(["settings:read"]));
    expect((await patch({ name: "x" })).status).toBe(403);

    mocks.authenticate.mockResolvedValue(principal(["server:read"]));
    const res = await settingsRoute.GET(
      req("/servers/server-a/settings"),
      onA(),
    );
    expect(res.status).toBe(403);
  });

  it("returns the join link", async () => {
    mocks.joinLink.mockResolvedValue("#qjoin=login:secret@Trackmania");
    const res = await joinLinkRoute.GET(
      req("/servers/server-a/join-link"),
      onA(),
    );
    expect(await res.json()).toEqual({
      data: { link: "#qjoin=login:secret@Trackmania" },
    });
  });
});
