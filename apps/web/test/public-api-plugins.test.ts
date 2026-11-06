import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  installed: vi.fn(),
  install: vi.fn(),
  reload: vi.fn(),
  enable: vi.fn(),
  config: vi.fn(),
  version: vi.fn(),
  uninstall: vi.fn(),
  scriptPlugin: vi.fn(),
  setScriptPlugin: vi.fn(),
  scriptVariables: vi.fn(),
  scriptEvent: vi.fn(),
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
vi.mock("@/services/plugins", () => ({
  getInstalledPluginsAs: mocks.installed,
}));
vi.mock("@/actions/server-only/plugins", () => ({
  installMarketplacePluginAs: mocks.install,
  reloadServerPluginsAs: mocks.reload,
  setServerPluginEnabledAs: mocks.enable,
  saveServerPluginConfigAs: mocks.config,
  changeMarketplacePluginVersionAs: mocks.version,
  uninstallServerPluginAs: mocks.uninstall,
}));
vi.mock("@/actions/gbx/server-only/server-plugin", () => ({
  getServerPluginAs: mocks.scriptPlugin,
  setServerPluginAs: mocks.setScriptPlugin,
  setServerPluginVariablesAs: mocks.scriptVariables,
  triggerServerPluginEventAs: mocks.scriptEvent,
}));

import * as configRoute from "@/app/api/v1/servers/[serverId]/plugins/[pluginId]/config/route";
import * as enabledRoute from "@/app/api/v1/servers/[serverId]/plugins/[pluginId]/enabled/route";
import * as pluginRoute from "@/app/api/v1/servers/[serverId]/plugins/[pluginId]/route";
import * as versionRoute from "@/app/api/v1/servers/[serverId]/plugins/[pluginId]/version/route";
import * as reloadRoute from "@/app/api/v1/servers/[serverId]/plugins/reload/route";
import * as pluginsRoute from "@/app/api/v1/servers/[serverId]/plugins/route";
import * as scriptEventsRoute from "@/app/api/v1/servers/[serverId]/server-plugin/events/route";
import * as scriptPluginRoute from "@/app/api/v1/servers/[serverId]/server-plugin/route";
import * as scriptVariablesRoute from "@/app/api/v1/servers/[serverId]/server-plugin/variables/route";
import { ServerError } from "@/types/responses";
import { actor, onA, principal, req } from "./helpers/public-api";

const send = (method: string, path: string, body?: unknown) =>
  req(`/servers/server-a${path}`, { method, body });
const onPlugin = () => onA({ pluginId: "plugin-1" });

const choice = {
  version: "1.1.0",
  stored: true,
  capabilities: ["ui"],
  yanked: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue(principal());
});

describe("v1 plugins", () => {
  it("lists installed plugins without their secrets or panel-only fields", async () => {
    mocks.installed.mockResolvedValue([
      {
        pluginId: "plugin-1",
        slug: "welcome",
        firstParty: true,
        name: "Welcome",
        description: null,
        author: "TMControlPanel",
        source: "marketplace",
        version: "1.0.0",
        enabled: true,
        yanked: false,
        yankReason: null,
        grantedCapabilities: ["ui"],
        capabilities: ["ui"],
        commands: [],
        gamemodes: [],
        configSchema: null,
        config: { greeting: "hi" },
        setSecrets: ["token"],
        update: choice,
        versions: [choice],
      },
    ]);
    const res = await pluginsRoute.GET(send("GET", "/plugins"), onA());
    expect(mocks.installed).toHaveBeenCalledWith(actor, "server-a");
    expect(await res.json()).toEqual({
      data: [
        {
          id: "plugin-1",
          slug: "welcome",
          name: "Welcome",
          description: null,
          author: "TMControlPanel",
          source: "marketplace",
          version: "1.0.0",
          enabled: true,
          yanked: false,
          grantedCapabilities: ["ui"],
          config: { greeting: "hi" },
          setSecrets: ["token"],
          update: { version: "1.1.0", capabilities: ["ui"], yanked: false },
          versions: [{ version: "1.1.0", capabilities: ["ui"], yanked: false }],
        },
      ],
    });
  });

  it("installs from the marketplace with the accepted capabilities", async () => {
    const res = await pluginsRoute.POST(
      send("POST", "/plugins", {
        slug: "welcome",
        version: "1.0.0",
        acceptedCapabilities: ["ui"],
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.install).toHaveBeenCalledWith(
      actor,
      "server-a",
      "welcome",
      "1.0.0",
      ["ui"],
    );
  });

  it.each([
    ["CapabilitiesNotAccepted", 400],
    ["PluginNotFound", 404],
    ["PluginYanked", 409],
    ["PluginIncompatible", 409],
  ])("answers %s with %i", async (code, status) => {
    mocks.install.mockRejectedValue(new ServerError("No", code));
    const res = await pluginsRoute.POST(
      send("POST", "/plugins", { slug: "welcome", version: "1.0.0" }),
      onA(),
    );
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
  });

  it("enables, configures, changes version, reloads and uninstalls", async () => {
    await enabledRoute.PUT(
      send("PUT", "/plugins/plugin-1/enabled", { enabled: false }),
      onPlugin(),
    );
    expect(mocks.enable).toHaveBeenCalledWith(
      actor,
      "server-a",
      "plugin-1",
      false,
    );

    await configRoute.PUT(
      send("PUT", "/plugins/plugin-1/config", {
        config: { greeting: "hello" },
        clearedSecrets: ["token"],
      }),
      onPlugin(),
    );
    expect(mocks.config).toHaveBeenCalledWith(
      actor,
      "server-a",
      "plugin-1",
      { greeting: "hello" },
      ["token"],
    );

    await versionRoute.PUT(
      send("PUT", "/plugins/plugin-1/version", { version: "1.1.0" }),
      onPlugin(),
    );
    expect(mocks.version).toHaveBeenCalledWith(
      actor,
      "server-a",
      "plugin-1",
      "1.1.0",
      [],
    );

    await reloadRoute.POST(send("POST", "/plugins/reload"), onA());
    expect(mocks.reload).toHaveBeenCalledWith(actor, "server-a");

    const res = await pluginRoute.DELETE(
      send("DELETE", "/plugins/plugin-1"),
      onPlugin(),
    );
    expect(res.status).toBe(204);
    expect(mocks.uninstall).toHaveBeenCalledWith(actor, "server-a", "plugin-1");
  });

  it("leaves private uploads to the panel", async () => {
    mocks.version.mockRejectedValue(
      new ServerError("Only marketplace plugins", "PluginNotFromMarketplace"),
    );
    const res = await versionRoute.PUT(
      send("PUT", "/plugins/plugin-1/version", { version: "2.0.0" }),
      onPlugin(),
    );
    expect(res.status).toBe(400);
  });

  it("needs plugins:write to change anything", async () => {
    mocks.authenticate.mockResolvedValue(principal(["plugins:read"]));
    const res = await pluginRoute.DELETE(
      send("DELETE", "/plugins/plugin-1"),
      onPlugin(),
    );
    expect(res.status).toBe(403);
    expect(mocks.uninstall).not.toHaveBeenCalled();
  });
});

describe("v1 server script plugin", () => {
  it("describes the loaded plugin", async () => {
    mocks.scriptPlugin.mockResolvedValue({
      Name: "Plugin.Script.txt",
      SettingsDesc: [
        { Name: "S_On", Desc: "On", Type: "boolean", Default: true },
      ],
      SettingsValues: { S_On: false },
    });
    const res = await scriptPluginRoute.GET(
      send("GET", "/server-plugin"),
      onA(),
    );
    expect(await res.json()).toEqual({
      data: {
        name: "Plugin.Script.txt",
        settings: [
          { name: "S_On", description: "On", type: "boolean", default: "true" },
        ],
        values: { S_On: false },
      },
    });
  });

  it("loads a plugin, sets variables and sends events", async () => {
    await scriptPluginRoute.PUT(
      send("PUT", "/server-plugin", { name: "Plugin.Script.txt" }),
      onA(),
    );
    expect(mocks.setScriptPlugin).toHaveBeenCalledWith(
      actor,
      "server-a",
      false,
      "Plugin.Script.txt",
      {},
    );

    await scriptVariablesRoute.PATCH(
      send("PATCH", "/server-plugin/variables", { variables: { X: 1 } }),
      onA(),
    );
    expect(mocks.scriptVariables).toHaveBeenCalledWith(actor, "server-a", {
      X: 1,
    });

    await scriptEventsRoute.POST(
      send("POST", "/server-plugin/events", { name: "Ping", params: ["a"] }),
      onA(),
    );
    expect(mocks.scriptEvent).toHaveBeenCalledWith(actor, "server-a", "Ping", [
      "a",
    ]);
  });
});
