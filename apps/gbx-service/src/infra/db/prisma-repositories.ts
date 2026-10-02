import type { NotificationDto, PlayerInfo } from "@gcp/shared";
import type { DbClient, Maps, Notifications } from "@gcp/db";
import type {
  LocalRecord,
  MapMetadata,
  MapRecord,
  MapRepository,
  MatchRepository,
  NewMap,
  NotificationRepository,
  PlayerRepository,
  RecordInput,
  RecordRepository,
  ServerPluginRecord,
  ServerRecord,
  ServerRepository,
  UserRepository,
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
      include: { serverPlugins: { include: { plugin: true } } },
    });
    if (!server) return null;

    return {
      id: server.id,
      name: server.name,
      host: server.host,
      port: server.port,
      user: server.user,
      password: server.password,
      enableHelpCommand: server.enableHelpCommand,
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
      plugins: server.serverPlugins.map((sp) => ({
        pluginId: sp.pluginId,
        name: sp.plugin.name,
        enabled: sp.enabled,
        config: sp.config,
      })),
    };
  }

  async findPlugins(serverId: string): Promise<ServerPluginRecord[]> {
    const rows = await this.db.serverPlugins.findMany({
      where: { serverId },
      include: { plugin: true },
    });
    return rows.map((sp) => ({
      pluginId: sp.pluginId,
      name: sp.plugin.name,
      enabled: sp.enabled,
      config: sp.config,
    }));
  }

  async updatePluginConfig(serverId: string, pluginId: string, config: unknown): Promise<void> {
    await this.db.serverPlugins.update({
      where: { serverId_pluginId: { serverId, pluginId } },
      data: { config: config as never },
    });
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
