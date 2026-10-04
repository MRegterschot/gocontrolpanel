import type {
  ChatConfig,
  JukeboxEntry,
  NotificationDto,
  PlayerInfo,
} from "@gcp/shared";

// Persistence and external-service ports used by the core. Implemented in infra/, faked in tests.

export interface ServerRecord {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  chat: ChatConfig;
  enableHelpCommand: boolean;
  plugins: ServerPluginRecord[];
}

export interface ServerPluginRecord {
  pluginId: string;
  // Stable plugin name, e.g. "live-ranking", or the package slug
  name: string;
  enabled: boolean;
  config: unknown;
  // Installed package of a marketplace or uploaded plugin; absent for built-ins
  package?: InstalledPackageRef | null;
}

export interface InstalledPackageRef {
  versionId: string;
  version: string;
  sha256: string;
  source: "marketplace" | "upload";
  // What the admin consented to; the sandbox grants nothing beyond this
  grantedCapabilities: string[];
  // Withdrawn from the marketplace; never loaded
  yanked?: boolean;
}

export interface ServerRepository {
  // Non-deleted servers only
  listActiveIds(): Promise<string[]>;
  findById(serverId: string): Promise<ServerRecord | null>;
  findPlugins(serverId: string): Promise<ServerPluginRecord[]>;
  updatePluginConfig(serverId: string, pluginId: string, config: unknown): Promise<void>;
  setPluginEnabled(serverId: string, pluginId: string, enabled: boolean): Promise<void>;
}

export interface PluginPackageRepository {
  // The stored zip of an installed version
  loadPackage(versionId: string): Promise<Uint8Array | null>;
}

export interface PluginYank {
  slug: string;
  version: string;
  reason: string | null;
}

export interface YankedInstall {
  serverId: string;
  pluginId: string;
  name: string;
  version: string;
  reason: string | null;
}

export interface PluginCatalogRepository {
  // Marks the versions yanked, turns off every server plugin running one and returns those
  applyYanks(yanks: PluginYank[]): Promise<YankedInstall[]>;
}

export interface PluginStorageUsage {
  keys: number;
  bytes: number;
}

// Key-value data of sandboxed plugins, per server
export interface PluginStorageRepository {
  get(serverId: string, pluginId: string, key: string): Promise<unknown>;
  set(serverId: string, pluginId: string, key: string, value: unknown, size: number): Promise<void>;
  delete(serverId: string, pluginId: string, key: string): Promise<void>;
  keys(serverId: string, pluginId: string, prefix: string, limit: number): Promise<string[]>;
  usage(serverId: string, pluginId: string): Promise<PluginStorageUsage>;
  // Size of one stored value, 0 when absent
  sizeOf(serverId: string, pluginId: string, key: string): Promise<number>;
}

export interface PluginHttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  maxResponseBytes: number;
}

export interface PluginHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

// Outbound HTTPS for plugins with an http:<host> capability; refuses private addresses
export interface PluginHttpClient {
  fetch(request: PluginHttpRequest): Promise<PluginHttpResponse>;
}

export interface PlayerRepository {
  upsertMany(players: PlayerInfo[]): Promise<void>;
  upsert(player: PlayerInfo): Promise<void>;
}

export interface MapRecord {
  id: string;
  uid: string;
  name: string;
  fileName: string;
  author: string;
  authorNickname: string;
  thumbnailUrl: string | null;
  uploadCheck: Date | null;
}

export interface NewMap {
  uid: string;
  name: string;
  fileName: string;
  author: string;
  authorNickname: string;
  authorTime: number;
  goldTime: number;
  silverTime: number;
  bronzeTime: number;
}

export interface MapMetadata {
  submitter: string;
  timestamp: Date;
  fileUrl: string;
  thumbnailUrl: string;
}

export interface MapRepository {
  findByUid(uid: string): Promise<MapRecord | null>;
  findByFileNames(fileNames: string[]): Promise<MapRecord[]>;
  create(map: NewMap, metadata: MapMetadata | null): Promise<MapRecord>;
  updateMetadata(mapId: string, metadata: MapMetadata | null): Promise<MapRecord>;
}

export interface MatchRepository {
  create(input: { serverId: string; mapId: string; mode: string }): Promise<{ id: string }>;
}

export interface RecordInput {
  serverId: string;
  matchId: string | null;
  round: number | null;
  mapId: string;
  mapUid: string;
  login: string;
  time: number;
  checkpoints: number[];
  points?: number;
}

export interface LocalRecord {
  login: string | null;
  time: number;
  nickName: string | null;
}

export interface RecordRepository {
  // Upserts on (matchId, login, round) when both are set, inserts otherwise
  save(record: RecordInput): Promise<void>;
  // Best time on this server and on servers sharing records through a group
  findLocalRecord(serverId: string, mapUid: string): Promise<LocalRecord | null>;
  // Best time per login on servers sharing records through a group
  findPlayerRecords(serverId: string, mapUid: string, logins: string[]): Promise<LocalRecord[]>;
}

export interface UserRepository {
  // Creates a placeholder user so records referencing the login can be stored
  ensureExists(login: string, nickName: string): Promise<void>;
}

export interface NotificationRepository {
  // One notification per user that administers the server (direct or via group)
  createForServerAdmins(input: {
    serverId: string;
    type: string;
    message: string;
    description?: string;
  }): Promise<NotificationDto[]>;
}

export interface JukeboxStore {
  peek(serverId: string): Promise<JukeboxEntry | null>;
  pop(serverId: string): Promise<void>;
}

export interface MapMetadataProvider {
  // Nadeo map info; returns only the maps Nadeo knows about
  getMapsMetadata(uids: string[]): Promise<Map<string, MapMetadata>>;
}

export interface LeaderboardEntry {
  accountId: string;
  score: number;
}

export interface NadeoRecordsProvider {
  getWorldRecord(mapUid: string): Promise<LeaderboardEntry | null>;
  // Personal bests keyed by account id
  getPersonalBests(mapUid: string, accountIds: string[]): Promise<Map<string, number>>;
  getAccountNames(accountIds: string[]): Promise<Record<string, string>>;
}

export interface EcmClient {
  driverFinish(
    apiKey: string,
    body: { finishTime: number; ubisoftUid: string; roundNum: number; mapId: string },
  ): Promise<void>;
  roundEnd(
    apiKey: string,
    body: {
      players: { finishTime: number; ubisoftUid: string; position: number }[];
      roundNum: number;
      mapId: string;
    },
  ): Promise<void>;
}

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  sleep(ms: number): Promise<void>;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as NodeJS.Timeout),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
