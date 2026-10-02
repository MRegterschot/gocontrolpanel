import type { JukeboxEntry, NotificationDto, PlayerInfo } from "@gcp/shared";
import type {
  EcmClient,
  JukeboxStore,
  LeaderboardEntry,
  LocalRecord,
  MapMetadata,
  MapMetadataProvider,
  MapRecord,
  MapRepository,
  MatchRepository,
  NadeoRecordsProvider,
  NewMap,
  NotificationRepository,
  PlayerRepository,
  RecordInput,
  RecordRepository,
  ServerPluginRecord,
  ServerRecord,
  ServerRepository,
  UserRepository,
} from "../../src/core/ports";

export class InMemoryServerRepository implements ServerRepository {
  readonly servers = new Map<string, ServerRecord>();
  readonly configUpdates: { serverId: string; pluginId: string; config: unknown }[] = [];

  add(server: ServerRecord): this {
    this.servers.set(server.id, server);
    return this;
  }

  async listActiveIds() {
    return [...this.servers.keys()];
  }

  async findById(serverId: string) {
    const server = this.servers.get(serverId);
    return server ? structuredClone(server) : null;
  }

  async findPlugins(serverId: string): Promise<ServerPluginRecord[]> {
    return structuredClone(this.servers.get(serverId)?.plugins ?? []);
  }

  async updatePluginConfig(serverId: string, pluginId: string, config: unknown) {
    this.configUpdates.push({ serverId, pluginId, config });
    const plugin = this.servers.get(serverId)?.plugins.find((p) => p.pluginId === pluginId);
    if (plugin) plugin.config = config;
  }
}

export class InMemoryPlayerRepository implements PlayerRepository, UserRepository {
  readonly users = new Map<string, string>();
  failNextUpsert = false;

  async upsertMany(players: PlayerInfo[]) {
    players.forEach((p) => this.users.set(p.login, p.nickName));
  }

  async upsert(player: PlayerInfo) {
    if (this.failNextUpsert) {
      this.failNextUpsert = false;
      throw new Error("db down");
    }
    this.users.set(player.login, player.nickName);
  }

  async ensureExists(login: string, nickName: string) {
    if (!this.users.has(login)) this.users.set(login, nickName);
  }
}

export class InMemoryMapRepository implements MapRepository {
  readonly maps = new Map<string, MapRecord>();
  private nextId = 1;

  async findByUid(uid: string) {
    return this.maps.get(uid) ?? null;
  }

  async findByFileNames(fileNames: string[]) {
    return [...this.maps.values()].filter((map) => fileNames.includes(map.fileName));
  }

  async create(map: NewMap, metadata: MapMetadata | null) {
    const record: MapRecord = {
      id: `map-${this.nextId++}`,
      uid: map.uid,
      name: map.name,
      fileName: map.fileName,
      author: map.author,
      authorNickname: map.authorNickname,
      thumbnailUrl: metadata?.thumbnailUrl ?? null,
      uploadCheck: new Date(),
    };
    this.maps.set(map.uid, record);
    return record;
  }

  async updateMetadata(mapId: string, metadata: MapMetadata | null) {
    const map = [...this.maps.values()].find((m) => m.id === mapId)!;
    map.thumbnailUrl = metadata?.thumbnailUrl ?? map.thumbnailUrl;
    map.uploadCheck = new Date();
    return map;
  }
}

export class InMemoryMatchRepository implements MatchRepository {
  readonly matches: { id: string; serverId: string; mapId: string; mode: string }[] = [];

  async create(input: { serverId: string; mapId: string; mode: string }) {
    const match = { id: `match-${this.matches.length + 1}`, ...input };
    this.matches.push(match);
    return { id: match.id };
  }
}

export class InMemoryRecordRepository implements RecordRepository {
  readonly saved: RecordInput[] = [];
  localRecord: LocalRecord | null = null;
  playerRecords: LocalRecord[] = [];
  // Fails saves for these logins until the user exists
  requireUsers: InMemoryPlayerRepository | null = null;

  async save(record: RecordInput) {
    if (this.requireUsers && !this.requireUsers.users.has(record.login)) {
      throw new Error(`Foreign key violation for ${record.login}`);
    }
    this.saved.push(record);
  }

  async findLocalRecord() {
    return this.localRecord;
  }

  async findPlayerRecords(_serverId: string, _mapUid: string, logins: string[]) {
    return this.playerRecords.filter((r) => r.login && logins.includes(r.login));
  }
}

export class InMemoryNotificationRepository implements NotificationRepository {
  adminUserIds: string[] = ["admin-1"];
  readonly created: NotificationDto[] = [];

  async createForServerAdmins(input: {
    serverId: string;
    type: string;
    message: string;
    description?: string;
  }) {
    const now = new Date().toISOString();
    const rows = this.adminUserIds.map((userId, i) => ({
      id: `notification-${this.created.length + i + 1}`,
      userId,
      serverId: input.serverId,
      type: input.type,
      message: input.message,
      description: input.description ?? null,
      read: false,
      timestamp: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }));
    this.created.push(...rows);
    return rows;
  }
}

export class InMemoryJukeboxStore implements JukeboxStore {
  readonly queues = new Map<string, JukeboxEntry[]>();

  async peek(serverId: string) {
    return this.queues.get(serverId)?.[0] ?? null;
  }

  async pop(serverId: string) {
    this.queues.get(serverId)?.shift();
  }
}

export class FakeNadeo implements MapMetadataProvider, NadeoRecordsProvider {
  metadata = new Map<string, MapMetadata>();
  worldRecords = new Map<string, LeaderboardEntry>();
  personalBests = new Map<string, number>();
  names: Record<string, string> = {};
  fail = false;

  async getMapsMetadata(uids: string[]) {
    if (this.fail) throw new Error("nadeo down");
    return new Map(uids.filter((uid) => this.metadata.has(uid)).map((uid) => [uid, this.metadata.get(uid)!]));
  }

  async getWorldRecord(mapUid: string) {
    if (this.fail) throw new Error("nadeo down");
    return this.worldRecords.get(mapUid) ?? null;
  }

  async getPersonalBests(_mapUid: string, accountIds: string[]) {
    if (this.fail) throw new Error("nadeo down");
    return new Map(
      accountIds.filter((id) => this.personalBests.has(id)).map((id) => [id, this.personalBests.get(id)!]),
    );
  }

  async getAccountNames(accountIds: string[]) {
    return Object.fromEntries(accountIds.filter((id) => this.names[id]).map((id) => [id, this.names[id]]));
  }
}

export class FakeEcm implements EcmClient {
  readonly finishes: { apiKey: string; body: unknown }[] = [];
  readonly rounds: { apiKey: string; body: Parameters<EcmClient["roundEnd"]>[1] }[] = [];

  async driverFinish(apiKey: string, body: Parameters<EcmClient["driverFinish"]>[1]) {
    this.finishes.push({ apiKey, body });
  }

  async roundEnd(apiKey: string, body: Parameters<EcmClient["roundEnd"]>[1]) {
    this.rounds.push({ apiKey, body });
  }
}
