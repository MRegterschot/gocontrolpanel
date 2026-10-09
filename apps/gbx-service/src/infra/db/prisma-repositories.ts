import {
  resolveTheme,
  type NotificationDto,
  type PlayerInfo,
  type PluginManifest,
} from "@gcp/shared";
import type { DbClient, Maps, Notifications, Prisma } from "@gcp/db";
import type {
  FirstPartyInstall,
  FirstPartyRepository,
  LocalRecord,
  MapMetadata,
  MapRecord,
  MapRepository,
  MatchRepository,
  NewMap,
  NotificationRepository,
  PlayerRepository,
  PluginCatalogRepository,
  PluginPackageRepository,
  PluginStorageRepository,
  PluginStorageUsage,
  PluginYank,
  RecordInput,
  RecordRepository,
  ServerPluginRecord,
  ServerRecord,
  ServerRepository,
  UserRepository,
  YankedInstall,
} from "../../core/ports";

function toMapRecord(map: Maps): MapRecord {
  return {
    id: map.id,
    uid: map.uid,
    name: map.name,
    fileName: map.fileName,
    author: map.author,
    authorNickname: map.authorNickname,
    thumbnailUrl: map.thumbnailUrl,
    uploadCheck: map.uploadCheck,
  };
}

export function toNotificationDto(row: Notifications): NotificationDto {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    message: row.message,
    description: row.description,
    read: row.read,
    timestamp: row.timestamp.toISOString(),
    serverId: row.serverId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

function metadataFields(metadata: MapMetadata | null) {
  return {
    submitter: metadata?.submitter ?? null,
    timestamp: metadata?.timestamp ?? null,
    fileUrl: metadata?.fileUrl ?? null,
    thumbnailUrl: metadata?.thumbnailUrl ?? null,
    uploadCheck: new Date(),
  };
}

const serverPluginInclude = {
  plugin: { select: { name: true, source: true } },
  version: { select: { id: true, version: true, sha256: true, yanked: true } },
} satisfies Prisma.ServerPluginsInclude;

type ServerPluginRow = Prisma.ServerPluginsGetPayload<{ include: typeof serverPluginInclude }>;

function toPluginRecord(sp: ServerPluginRow): ServerPluginRecord {
  const source = sp.plugin.source;
  return {
    pluginId: sp.pluginId,
    name: sp.plugin.name,
    enabled: sp.enabled,
    config: sp.config,
    package:
      sp.version && source !== "builtin"
        ? {
            versionId: sp.version.id,
            version: sp.version.version,
            sha256: sp.version.sha256,
            source,
            grantedCapabilities: Array.isArray(sp.grantedCapabilities)
              ? sp.grantedCapabilities.filter((c): c is string => typeof c === "string")
              : [],
            yanked: sp.version.yanked,
          }
        : null,
  };
}

export class PrismaServerRepository implements ServerRepository {
  constructor(private readonly db: DbClient) {}

  async listActiveIds(): Promise<string[]> {
    const rows = await this.db.servers.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async findById(serverId: string): Promise<ServerRecord | null> {
    const server = await this.db.servers.findFirst({
      where: { id: serverId, deletedAt: null },
      include: {
        serverPlugins: { include: serverPluginInclude },
        groupServers: {
          where: { group: { deletedAt: null } },
          select: { group: { select: { theme: true, createdAt: true } } },
        },
      },
    });
    if (!server) return null;
    // The oldest group decides when several have a theme
    const groupThemes = server.groupServers
      .map((gs) => gs.group)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((group) => group.theme);

    return {
      id: server.id,
      name: server.name,
      host: server.host,
      port: server.port,
      user: server.user,
      password: server.password,
      enableHelpCommand: server.enableHelpCommand,
      theme: resolveTheme(server.theme, groupThemes),
      chat: {
        manualRouting: server.manualRouting,
        messageFormat: server.messageFormat,
        connectMessage: server.connectMessage,
        disconnectMessage: server.disconnectMessage,
        scriptNameChangeMessage: server.scriptNameChangeMessage,
        matchSettingsLoadedMessage: server.matchSettingsLoadedMessage,
        scriptSettingsSavedMessage: server.scriptSettingsSavedMessage,
        mapListChangeMessage: server.mapListChangeMessage,
      },
      plugins: server.serverPlugins.map(toPluginRecord),
    };
  }

  async findPlugins(serverId: string): Promise<ServerPluginRecord[]> {
    const rows = await this.db.serverPlugins.findMany({
      where: { serverId },
      include: serverPluginInclude,
    });
    return rows.map(toPluginRecord);
  }

  async updatePluginConfig(serverId: string, pluginId: string, config: unknown): Promise<void> {
    await this.db.serverPlugins.update({
      where: { serverId_pluginId: { serverId, pluginId } },
      data: { config: config as never },
    });
  }

  async setPluginEnabled(serverId: string, pluginId: string, enabled: boolean): Promise<void> {
    await this.db.serverPlugins.updateMany({ where: { serverId, pluginId }, data: { enabled } });
  }
}

export class PrismaPluginPackageRepository implements PluginPackageRepository {
  constructor(private readonly db: DbClient) {}

  async loadPackage(versionId: string): Promise<Uint8Array | null> {
    const row = await this.db.pluginVersions.findUnique({
      where: { id: versionId },
      select: { package: true },
    });
    return row ? new Uint8Array(row.package) : null;
  }
}

export class PrismaPluginCatalogRepository implements PluginCatalogRepository {
  constructor(private readonly db: DbClient) {}

  async applyYanks(yanks: PluginYank[]): Promise<YankedInstall[]> {
    const affected: YankedInstall[] = [];
    for (const yank of yanks) {
      const version = await this.db.pluginVersions.findFirst({
        where: { version: yank.version, plugin: { name: yank.slug, source: "marketplace" } },
        select: { id: true, yanked: true },
      });
      if (!version) continue;

      const running = await this.db.serverPlugins.findMany({
        where: { versionId: version.id, enabled: true },
        select: { serverId: true, pluginId: true },
      });
      if (!version.yanked) {
        await this.db.pluginVersions.update({
          where: { id: version.id },
          data: { yanked: true, yankReason: yank.reason },
        });
      }
      if (running.length > 0) {
        await this.db.serverPlugins.updateMany({
          where: { versionId: version.id },
          data: { enabled: false },
        });
      }
      for (const sp of running) {
        affected.push({ ...sp, name: yank.slug, version: yank.version, reason: yank.reason });
      }
    }
    return affected;
  }
}

export class PrismaPluginStorageRepository implements PluginStorageRepository {
  constructor(private readonly db: DbClient) {}

  async get(serverId: string, pluginId: string, key: string): Promise<unknown> {
    const row = await this.db.pluginStorage.findUnique({
      where: { serverId_pluginId_key: { serverId, pluginId, key } },
      select: { value: true },
    });
    return row ? row.value : null;
  }

  async set(serverId: string, pluginId: string, key: string, value: unknown, size: number) {
    const json = value as Prisma.InputJsonValue;
    await this.db.pluginStorage.upsert({
      where: { serverId_pluginId_key: { serverId, pluginId, key } },
      create: { serverId, pluginId, key, value: json, size },
      update: { value: json, size },
    });
  }

  async delete(serverId: string, pluginId: string, key: string): Promise<void> {
    await this.db.pluginStorage.deleteMany({ where: { serverId, pluginId, key } });
  }

  async keys(serverId: string, pluginId: string, prefix: string, limit: number): Promise<string[]> {
    const rows = await this.db.pluginStorage.findMany({
      where: { serverId, pluginId, ...(prefix ? { key: { startsWith: prefix } } : {}) },
      select: { key: true },
      orderBy: { key: "asc" },
      take: limit,
    });
    return rows.map((row) => row.key);
  }

  async usage(serverId: string, pluginId: string): Promise<PluginStorageUsage> {
    const result = await this.db.pluginStorage.aggregate({
      where: { serverId, pluginId },
      _count: { _all: true },
      _sum: { size: true },
    });
    return { keys: result._count._all, bytes: result._sum.size ?? 0 };
  }

  async sizeOf(serverId: string, pluginId: string, key: string): Promise<number> {
    const row = await this.db.pluginStorage.findUnique({
      where: { serverId_pluginId_key: { serverId, pluginId, key } },
      select: { size: true },
    });
    return row?.size ?? 0;
  }
}

export class PrismaPlayerRepository implements PlayerRepository, UserRepository {
  constructor(private readonly db: DbClient) {}

  async upsertMany(players: PlayerInfo[]): Promise<void> {
    if (players.length === 0) return;

    const existing = await this.db.users.findMany({
      where: { login: { in: players.map((p) => p.login) } },
      select: { login: true, nickName: true },
    });
    const nickByLogin = new Map(existing.map((u) => [u.login, u.nickName]));

    const created = players.filter((p) => !nickByLogin.has(p.login));
    if (created.length > 0) {
      await this.db.users.createMany({
        data: created.map((p) => ({ login: p.login, nickName: p.nickName, path: "" })),
        skipDuplicates: true,
      });
    }

    const renamed = players.filter(
      (p) => nickByLogin.has(p.login) && nickByLogin.get(p.login) !== p.nickName,
    );
    await Promise.all(
      renamed.map((p) =>
        this.db.users.update({ where: { login: p.login }, data: { nickName: p.nickName } }),
      ),
    );
  }

  async upsert(player: PlayerInfo): Promise<void> {
    await this.db.users.upsert({
      where: { login: player.login },
      update: { nickName: player.nickName },
      create: { login: player.login, nickName: player.nickName, path: "" },
    });
  }

  async ensureExists(login: string, nickName: string): Promise<void> {
    await this.db.users.upsert({
      where: { login },
      update: {},
      create: { login, nickName, path: "" },
    });
  }
}

export class PrismaMapRepository implements MapRepository {
  constructor(private readonly db: DbClient) {}

  async findByUid(uid: string): Promise<MapRecord | null> {
    const map = await this.db.maps.findFirst({ where: { uid, deletedAt: null } });
    return map ? toMapRecord(map) : null;
  }

  async findByFileNames(fileNames: string[]): Promise<MapRecord[]> {
    const maps = await this.db.maps.findMany({
      where: { fileName: { in: fileNames }, deletedAt: null },
    });
    return maps.map(toMapRecord);
  }

  async create(map: NewMap, metadata: MapMetadata | null): Promise<MapRecord> {
    const row = await this.db.maps.create({ data: { ...map, ...metadataFields(metadata) } });
    return toMapRecord(row);
  }

  async updateMetadata(mapId: string, metadata: MapMetadata | null): Promise<MapRecord> {
    const row = await this.db.maps.update({
      where: { id: mapId },
      data: metadata ? metadataFields(metadata) : { uploadCheck: new Date() },
    });
    return toMapRecord(row);
  }
}

export class PrismaMatchRepository implements MatchRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: { serverId: string; mapId: string; mode: string }) {
    const match = await this.db.matches.create({ data: input, select: { id: true } });
    return match;
  }
}

export class PrismaRecordRepository implements RecordRepository {
  constructor(private readonly db: DbClient) {}

  async save(record: RecordInput): Promise<void> {
    const values = {
      mapId: record.mapId,
      mapUid: record.mapUid,
      time: record.time,
      checkpoints: record.checkpoints,
      ...(record.points !== undefined ? { points: record.points } : {}),
    };

    if (record.matchId !== null && record.round !== null) {
      await this.db.records.upsert({
        where: {
          matchId_login_round: {
            matchId: record.matchId,
            login: record.login,
            round: record.round,
          },
        },
        update: values,
        create: {
          ...values,
          login: record.login,
          round: record.round,
          matchId: record.matchId,
          serverId: record.serverId,
        },
      });
      return;
    }

    await this.db.records.create({
      data: {
        ...values,
        login: record.login,
        round: record.round,
        matchId: record.matchId,
        serverId: record.serverId,
      },
    });
  }

  async findLocalRecord(serverId: string, mapUid: string): Promise<LocalRecord | null> {
    const serverIds = await this.sharedServerIds(serverId);
    const record = await this.db.records.findFirst({
      where: { serverId: { in: serverIds }, mapUid, deletedAt: null, time: { gt: 0 } },
      orderBy: [{ time: "asc" }, { createdAt: "asc" }],
      include: { user: { select: { nickName: true } } },
    });
    return record
      ? { login: record.login, time: record.time, nickName: record.user?.nickName ?? null }
      : null;
  }

  async findPlayerRecords(
    serverId: string,
    mapUid: string,
    logins: string[],
  ): Promise<LocalRecord[]> {
    const serverIds = await this.sharedServerIds(serverId);
    const records = await this.db.records.findMany({
      where: {
        serverId: { in: serverIds },
        mapUid,
        login: { in: logins },
        deletedAt: null,
        time: { gt: 0 },
      },
      orderBy: { time: "asc" },
      distinct: ["login"],
      include: { user: { select: { nickName: true } } },
    });
    return records.map((record) => ({
      login: record.login,
      time: record.time,
      nickName: record.user?.nickName ?? null,
    }));
  }

  // serverId plus servers sharing records with it through a group with shareRecords enabled
  private async sharedServerIds(serverId: string): Promise<string[]> {
    const groups = await this.db.groups.findMany({
      where: { groupServers: { some: { serverId } }, shareRecords: true },
      include: { groupServers: { select: { serverId: true } } },
    });
    const ids = groups.flatMap((group) => group.groupServers.map((gs) => gs.serverId));
    return [...new Set([serverId, ...ids])];
  }
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly db: DbClient) {}

  async createForServerAdmins(input: {
    serverId: string;
    type: string;
    message: string;
    description?: string;
  }): Promise<NotificationDto[]> {
    const admins = await this.db.users.findMany({
      where: {
        OR: [
          { userServers: { some: { serverId: input.serverId, role: "Admin" } } },
          {
            groupMembers: {
              some: {
                role: "Admin",
                group: { groupServers: { some: { serverId: input.serverId } } },
              },
            },
          },
        ],
      },
      select: { id: true },
      distinct: ["id"],
    });

    const rows = await Promise.all(
      admins.map((admin) =>
        this.db.notifications.create({
          data: {
            userId: admin.id,
            serverId: input.serverId,
            type: input.type,
            message: input.message,
            description: input.description,
          },
        }),
      ),
    );
    return rows.map(toNotificationDto);
  }
}

export class PrismaFirstPartyRepository implements FirstPartyRepository {
  constructor(private readonly db: DbClient) {}

  async install(manifest: PluginManifest, sha256: string, bytes: Uint8Array): Promise<FirstPartyInstall> {
    const result: FirstPartyInstall = {
      slug: manifest.slug,
      version: manifest.version,
      stored: false,
      migrated: 0,
      removed: 0,
    };

    return this.db.$transaction(async (tx) => {
      const details = {
        displayName: manifest.name,
        description: manifest.description,
        author: manifest.author,
      };

      let plugin = await tx.plugins.findUnique({ where: { name: manifest.slug } });
      if (plugin?.source === "upload") {
        return { ...result, skipped: "an uploaded plugin uses this name" };
      }
      if (!plugin) {
        plugin = await tx.plugins.create({
          data: { name: manifest.slug, source: "marketplace", ...details },
        });
      } else if (plugin.source === "builtin") {
        plugin = await tx.plugins.update({
          where: { id: plugin.id },
          data: { source: "marketplace", ...details },
        });
      }

      let version = await tx.pluginVersions.findUnique({
        where: { pluginId_version: { pluginId: plugin.id, version: manifest.version } },
        select: { id: true },
      });
      if (!version) {
        version = await tx.pluginVersions.create({
          data: {
            pluginId: plugin.id,
            version: manifest.version,
            sdk: manifest.sdk,
            sha256,
            size: bytes.byteLength,
            manifest: manifest as unknown as Prisma.InputJsonValue,
            package: Buffer.from(bytes),
          },
          select: { id: true },
        });
        result.stored = true;
      }

      // Built-in installs from before the marketplace have no version
      const legacy = await tx.serverPlugins.findMany({
        where: { pluginId: plugin.id, versionId: null },
        select: { serverId: true, enabled: true, config: true },
      });
      for (const row of legacy) {
        const key = { serverId_pluginId: { serverId: row.serverId, pluginId: plugin.id } };
        // The old plugins form saved a row for every plugin; untouched ones aren't installs
        if (!row.enabled && row.config === null) {
          await tx.serverPlugins.delete({ where: key });
          result.removed++;
          continue;
        }
        await tx.serverPlugins.update({
          where: key,
          data: {
            versionId: version.id,
            // They ran with full access before; this is what the package needs
            grantedCapabilities: manifest.capabilities,
            installedAt: new Date(),
          },
        });
        result.migrated++;
      }

      return result;
    });
  }
}
