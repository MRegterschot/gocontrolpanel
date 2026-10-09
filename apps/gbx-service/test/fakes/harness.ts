import { DEFAULT_THEME, type SMapInfo, type SPlayerInfo } from "@gcp/shared";
import { readPluginPackage } from "@gcp/shared/plugin-package";
import { fileURLToPath } from "node:url";
import { TemplateRenderer } from "../../src/core/manialink/template-renderer";
import type { SandboxLimits } from "../../src/core/plugins/sandbox/limits";
import type { SystemCommandServices } from "../../src/core/chat/system-commands";
import { PackageLoader } from "../../src/core/plugins/sandbox/package-loader";
import type { SandboxAssets } from "../../src/core/plugins/sandbox/sandboxed-plugin";
import type { PluginDefinition } from "../../src/core/plugins/sdk";
import type { ServerPluginRecord, ServerRecord } from "../../src/core/ports";
import { ServerRuntime } from "../../src/core/server/server-runtime";
import { loadSandboxAssets } from "../../src/infra/sandbox-assets";
import { loadTemplateSources } from "../../src/infra/templates";
import { FakeClock, flush } from "./clock";
import { FakeGbxSession } from "./fake-gbx";
import { silentLogger } from "./logger";
import {
  FakeHttpClient,
  FakeNadeo,
  InMemoryJukeboxStore,
  InMemoryMapRepository,
  InMemoryMatchRepository,
  InMemoryNotificationRepository,
  InMemoryPlayerRepository,
  InMemoryPluginPackages,
  InMemoryPluginStorage,
  InMemoryRecordRepository,
  InMemoryServerRepository,
} from "./repositories";

let renderer: TemplateRenderer | null = null;
let assets: Promise<SandboxAssets> | null = null;

const TEMPLATES_DIR = fileURLToPath(
  new URL("../../templates", import.meta.url),
);

export function testSandboxAssets(): Promise<SandboxAssets> {
  assets ??= loadSandboxAssets(TEMPLATES_DIR);
  return assets;
}

// Shared runtime layouts only; plugin templates are owned by their packages.
export function testRenderer(): TemplateRenderer {
  renderer ??= new TemplateRenderer(loadTemplateSources(TEMPLATES_DIR));
  return renderer;
}

export const MAP_A: SMapInfo = {
  UId: "map-a-uid",
  Name: "Map A",
  FileName: "Campaigns/MapA.Map.Gbx",
  Author: "author-login",
  AuthorNickname: "Author",
  Environnement: "Stadium",
  Mood: "Day",
  BronzeTime: 60000,
  SilverTime: 50000,
  GoldTime: 45000,
  AuthorTime: 40000,
  CopperPrice: 0,
  LapRace: false,
  NbLaps: 0,
  NbCheckpoints: 3,
  MapType: "TrackMania\\TM_Race",
  MapStyle: "",
};

export const MAP_B: SMapInfo = {
  ...MAP_A,
  UId: "map-b-uid",
  Name: "$f00Map B",
  FileName: "Campaigns/MapB.Map.Gbx",
};

export const SERVER_ID = "server-1";

export function player(
  login: string,
  overrides: Partial<SPlayerInfo> = {},
): SPlayerInfo {
  return {
    Login: login,
    NickName: `Nick ${login}`,
    PlayerId: 1,
    SpectatorStatus: 0,
    TeamId: 0,
    LadderRanking: 0,
    Flags: 0,
    ...overrides,
  };
}

export function serverRecord(
  overrides: Partial<ServerRecord> = {},
): ServerRecord {
  return {
    id: SERVER_ID,
    name: "Test Server",
    host: "127.0.0.1",
    port: 5000,
    user: "SuperAdmin",
    password: "secret",
    enableHelpCommand: true,
    theme: DEFAULT_THEME,
    chat: {
      manualRouting: false,
      messageFormat: null,
      connectMessage: null,
      disconnectMessage: null,
      scriptNameChangeMessage: null,
      matchSettingsLoadedMessage: null,
      scriptSettingsSavedMessage: null,
      mapListChangeMessage: null,
    },
    plugins: [],
    ...overrides,
  };
}

export function pluginRecord(
  name: string,
  config: unknown = null,
  enabled = true,
): ServerPluginRecord {
  return { pluginId: `plugin-${name}`, name, enabled, config };
}

export interface PackageInstall {
  bytes: Uint8Array;
  // Defaults to everything the manifest declares
  granted?: string[];
  config?: unknown;
  enabled?: boolean;
  versionId?: string;
}

// The server_plugins row of an installed package, as the repository returns it
export function packageRecord(install: PackageInstall): ServerPluginRecord {
  const pkg = readPluginPackage(install.bytes);
  const versionId =
    install.versionId ?? `version-${pkg.manifest.slug}-${pkg.manifest.version}`;
  return {
    pluginId: `plugin-${pkg.manifest.slug}`,
    name: pkg.manifest.slug,
    enabled: install.enabled ?? true,
    config: install.config ?? null,
    package: {
      versionId,
      version: pkg.manifest.version,
      sha256: pkg.sha256,
      source: "upload",
      grantedCapabilities: install.granted ?? pkg.manifest.capabilities,
    },
  };
}

export interface HarnessOptions {
  server?: Partial<ServerRecord>;
  plugins?: PluginDefinition<any>[];
  scriptName?: string;
  scriptSettings?: Record<string, unknown>;
  players?: SPlayerInfo[];
  // Extra per-session setup, applied to every new session
  configure?: (session: FakeGbxSession) => void;
  connect?: boolean;
  // Installed marketplace/uploaded plugins, run in the sandbox
  packages?: PackageInstall[];
  sandboxLimits?: SandboxLimits;
  templates?: Record<string, string>;
  systemCommands?: SystemCommandServices;
}

export type Harness = Awaited<ReturnType<typeof createHarness>>;

export async function createHarness(options: HarnessOptions = {}) {
  const clock = new FakeClock();
  const servers = new InMemoryServerRepository().add(
    serverRecord(options.server),
  );
  const players = new InMemoryPlayerRepository();
  const maps = new InMemoryMapRepository();
  const matches = new InMemoryMatchRepository();
  const records = new InMemoryRecordRepository();
  const notifications = new InMemoryNotificationRepository();
  const jukebox = new InMemoryJukeboxStore();
  const nadeo = new FakeNadeo();
  const sessions: FakeGbxSession[] = [];
  const pluginPackages = new InMemoryPluginPackages();
  const pluginStorage = new InMemoryPluginStorage();
  const http = new FakeHttpClient();

  const server = servers.servers.get(SERVER_ID)!;
  for (const install of options.packages ?? []) {
    const record = packageRecord(install);
    pluginPackages.packages.set(record.package!.versionId, install.bytes);
    server.plugins.push(record);
  }
  const packages = new PackageLoader(pluginPackages, {
    assets: await testSandboxAssets(),
    storage: pluginStorage,
    http,
    clock,
    limits: options.sandboxLimits,
  });

  const world = {
    players: [...(options.players ?? [])],
    currentMap: MAP_A,
    mapList: [MAP_A, MAP_B],
    scriptName: options.scriptName ?? "Trackmania/TM_Rounds_Online.Script.txt",
    scriptSettings: options.scriptSettings ?? {
      S_PointsLimit: 50,
      S_RoundsPerMap: 5,
      S_PointsRepartition: "10,6,4",
    },
  };

  const newSession = () => {
    const session = new FakeGbxSession({
      GetCurrentMapInfo: () => world.currentMap,
      GetPlayerList: () => world.players,
      GetMainServerPlayerInfo: {
        Login: "server-login",
        NickName: "Server",
        PlayerId: 0,
      },
      GetPlayerInfo: (login: string) =>
        world.players.find((p) => p.Login === login) ?? player(login),
      GetScriptName: () => ({
        CurrentValue: world.scriptName,
        NextValue: world.scriptName,
      }),
      GetModeScriptSettings: () => world.scriptSettings,
      GetMapList: () => world.mapList,
      GetMapInfo: (fileName: string) =>
        world.mapList.find((m) => m.FileName === fileName),
      GetCurrentRanking: () => world.players,
      AddMapList: (fileNames: string[]) => fileNames.length,
      RemoveMapList: (fileNames: string[]) => fileNames.length,
    });
    options.configure?.(session);
    sessions.push(session);
    return session;
  };

  const runtime = new ServerRuntime(SERVER_ID, {
    log: silentLogger,
    clock,
    sessionFactory: newSession,
    renderer: options.templates
      ? new TemplateRenderer({
          ...loadTemplateSources(TEMPLATES_DIR),
          ...options.templates,
        })
      : testRenderer(),
    plugins: options.plugins ?? [],
    packages,
    servers,
    players,
    users: players,
    maps,
    matches,
    records,
    notifications,
    jukebox,
    mapMetadata: nadeo,
    nadeo,
    systemCommands: options.systemCommands,
  });

  if (options.connect !== false) {
    const connected = await runtime.start();
    if (!connected) throw new Error("Harness runtime failed to connect");
    await flush();
  }

  return {
    runtime,
    clock,
    world,
    sessions,
    get session(): FakeGbxSession {
      return sessions[sessions.length - 1];
    },
    servers,
    players,
    maps,
    matches,
    records,
    notifications,
    jukebox,
    nadeo,
    pluginPackages,
    pluginStorage,
    http,
    // Emits a callback on the current session and waits for handlers to settle
    async callback(method: string, data: unknown) {
      sessions[sessions.length - 1].emit(method, data);
      await flush();
    },
    async script(name: string, payload: unknown = {}) {
      sessions[sessions.length - 1].emitScript(name, payload);
      await flush();
    },
    async chat(login: string, text: string) {
      sessions[sessions.length - 1].emit("ManiaPlanet.PlayerChat", [
        1,
        login,
        text,
        false,
        0,
      ]);
      await flush();
    },
    async click(
      login: string,
      answer: string,
      entries: { Name: string; Value: string }[] = [],
    ) {
      sessions[sessions.length - 1].emit(
        "ManiaPlanet.PlayerManialinkPageAnswer",
        [1, login, answer, entries],
      );
      await flush();
    },
  };
}
