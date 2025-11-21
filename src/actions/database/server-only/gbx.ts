import { getMapsInfo } from "@/lib/api/nadeo";
import { getClient } from "@/lib/dbclient";
import { getGbxClient } from "@/lib/managers/gbxclient-manager";
import { Maps, Matches, Prisma, Servers } from "@/lib/prisma/generated";
import { getKeyActiveMap, getRedisClient } from "@/lib/redis";
import { Player, Scores } from "@/types/gbx/scores";
import { Waypoint } from "@/types/gbx/waypoint";
import { PlayerInfo } from "@/types/player";
import { ServerError } from "@/types/responses";
import "server-only";
import { getPlayerInfo } from "../../gbx/server-only";

const serversPluginsSchema = Prisma.validator<Prisma.ServerPluginsInclude>()({
  plugin: true,
});

export type ServerPluginsWithPlugin = Prisma.ServerPluginsGetPayload<{
  include: typeof serversPluginsSchema;
}>;

export async function createMap(
  map: Omit<
    Maps,
    | "id"
    | "submitter"
    | "timestamp"
    | "fileUrl"
    | "thumbnailUrl"
    | "uploadCheck"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  >,
): Promise<Maps> {
  const db = getClient();

  const { data: mapsInfo, error } = await getMapsInfo([map.uid]);
  if (error) {
    throw new ServerError(
      `Failed to fetch map info for UID ${map.uid}: ${error}`,
    );
  }

  const info = mapsInfo.find((m) => m.mapUid === map.uid);
  if (!info) {
    throw new ServerError(`Map info not found for UID ${map.uid}`);
  }

  const newMap = await db.maps.create({
    data: {
      ...map,
      submitter: info.submitter,
      timestamp: info.timestamp,
      fileUrl: info.fileUrl,
      thumbnailUrl: info.thumbnailUrl,
      uploadCheck: new Date(),
    },
  });
  return newMap;
}

const MAP_INFO_UPDATE_THRESHOLD_HOURS = 72;
const BATCH_SIZE = 200;

export async function checkAndUpdateMapsInfoIfNeeded(
  maps: Maps[],
): Promise<Maps[]> {
  const db = getClient();

  const shouldUpdate = (map: Maps): boolean => {
    return (
      !map.thumbnailUrl &&
      (!map.uploadCheck ||
        map.uploadCheck.getTime() <
          Date.now() - MAP_INFO_UPDATE_THRESHOLD_HOURS * 60 * 60 * 1000)
    );
  };

  const mapsNeedingUpdate = maps.filter(shouldUpdate);

  if (mapsNeedingUpdate.length === 0) return maps;

  const updatedMaps: Maps[] = [];

  for (let i = 0; i < mapsNeedingUpdate.length; i += BATCH_SIZE) {
    const batch = mapsNeedingUpdate.slice(i, i + BATCH_SIZE);
    const uids = batch.map((m) => m.uid);
    const { data: apiMapsInfo } = await getMapsInfo(uids);

    for (const map of batch) {
      const apiInfo = apiMapsInfo.find((m) => m.mapUid === map.uid);

      if (!apiInfo) {
        await db.maps.update({
          where: { id: map.id },
          data: {
            uploadCheck: new Date(),
          },
        });
        updatedMaps.push(map);
        continue;
      }

      await db.maps.update({
        where: { id: map.id },
        data: {
          submitter: apiInfo.submitter,
          timestamp: apiInfo.timestamp,
          fileUrl: apiInfo.fileUrl,
          thumbnailUrl: apiInfo.thumbnailUrl,
          uploadCheck: new Date(),
        },
      });

      updatedMaps.push({
        ...map,
        submitter: apiInfo.submitter,
        timestamp: apiInfo.timestamp,
        fileUrl: apiInfo.fileUrl,
        thumbnailUrl: apiInfo.thumbnailUrl,
        uploadCheck: new Date(),
      });
    }
  }

  // Replace updated maps in the original list
  const updatedMapByUid = new Map(updatedMaps.map((m) => [m.uid, m]));

  return maps.map((map) => updatedMapByUid.get(map.uid) ?? map);
}

export async function syncAllMaps(): Promise<Maps[]> {
  const db = getClient();
  const maps = await db.maps.findMany({
    where: {
      deletedAt: null,
    },
  });

  return await checkAndUpdateMapsInfoIfNeeded(maps);
}

export async function getMapByUid(uid: string): Promise<Maps | null> {
  const db = getClient();
  const map = await db.maps.findFirst({
    where: { uid, deletedAt: null },
  });

  if (!map) {
    return null;
  }

  const [updatedMap] = await checkAndUpdateMapsInfoIfNeeded([map]);

  return updatedMap;
}

export async function getServerPlugins(
  serverId: string,
): Promise<ServerPluginsWithPlugin[]> {
  const db = getClient();
  const plugins = await db.serverPlugins.findMany({
    where: { serverId },
    include: serversPluginsSchema,
  });

  return plugins;
}

export async function createMatch(
  serverId: string,
  mode: string,
): Promise<Matches> {
  const redis = await getRedisClient();
  const key = getKeyActiveMap(serverId);

  const activeMap = await redis.get(key);
  if (!activeMap) {
    throw new Error(`No active map found for server ${serverId}`);
  }

  const mapData: Maps = JSON.parse(activeMap);
  if (!mapData) {
    throw new Error(`Map data is invalid for server ${serverId}`);
  }

  const db = getClient();
  const match = await db.matches.create({
    data: {
      mapId: mapData.id,
      mode,
      serverId,
    },
  });

  return match;
}

export async function getAllServers(): Promise<Servers[]> {
  const db = getClient();
  const servers = await db.servers.findMany({
    where: { deletedAt: null },
  });

  return servers;
}

export async function syncPlayers(players: PlayerInfo[]): Promise<void> {
  const db = getClient();

  // Create 2 lists, one with logins that already exist in the database, and one with logins that don't
  const logins = players.map((p) => p.login);
  const existingUsers = await db.users.findMany({
    where: { login: { in: logins } },
    select: { id: true, login: true, nickName: true },
  });

  const existingLogins = new Set(existingUsers.map((u) => u.login));
  const newPlayers = players.filter((p) => !existingLogins.has(p.login));

  // Bulk create new users
  if (newPlayers.length > 0) {
    await db.users.createMany({
      data: newPlayers.map((p) => ({
        login: p.login,
        nickName: p.nickName,
        path: "",
      })),
      skipDuplicates: true,
    });
  }

  const usersToUpdate = [];
  // Update nicknames of existing users if they have changed
  for (const player of players) {
    const existingUser = existingUsers.find((u) => u.login === player.login);
    if (existingUser && existingUser.nickName !== player.nickName) {
      usersToUpdate.push(player);
    }
  }

  await Promise.all(
    usersToUpdate.map((p) =>
      db.users.update({
        where: { login: p.login },
        data: { nickName: p.nickName },
      }),
    ),
  );
}

export async function syncPlayer(player: PlayerInfo): Promise<void> {
  const db = getClient();

  await db.users.upsert({
    where: { login: player.login },
    update: { nickName: player.nickName },
    create: {
      login: player.login,
      nickName: player.nickName,
      path: "",
    },
  });
}

export async function syncLogin(
  serverId: string,
  login: string,
): Promise<void> {
  const client = await getGbxClient(serverId);
  const info = await getPlayerInfo(client, login);

  await syncPlayer(info);
}

export async function saveMatchRecord(
  serverId: string,
  matchId: string | null,
  waypoint: Waypoint,
  round: number | null = null,
): Promise<void> {
  const redis = await getRedisClient();
  const key = getKeyActiveMap(serverId);

  const activeMap = await redis.get(key);
  if (!activeMap) {
    throw new Error(`No active map found for server ${serverId}`);
  }

  const mapData: Maps = JSON.parse(activeMap);
  if (!mapData) {
    throw new Error(`Map data is invalid for server ${serverId}`);
  }

  const db = getClient();

  const createRecord = async () => {
    if (matchId !== null && round !== null) {
      // Only upsert if both matchId and round are provided
      await db.records.upsert({
        where: {
          matchId_login_round: {
            login: waypoint.login,
            matchId,
            round,
          },
        },
        update: {
          mapId: mapData.id,
          mapUid: mapData.uid,
          time: waypoint.racetime,
          checkpoints: waypoint.curracecheckpoints || [],
        },
        create: {
          mapId: mapData.id,
          mapUid: mapData.uid,
          login: waypoint.login,
          time: waypoint.racetime,
          checkpoints: waypoint.curracecheckpoints || [],
          round,
          matchId,
          serverId,
        },
      });
    } else {
      // Otherwise, just create a new record
      await db.records.create({
        data: {
          mapId: mapData.id,
          mapUid: mapData.uid,
          login: waypoint.login,
          time: waypoint.racetime,
          checkpoints: waypoint.curracecheckpoints || [],
          round,
          matchId,
          serverId,
        },
      });
    }
  };

  try {
    await createRecord();
  } catch (error) {
    console.error("Error saving record:", error);

    try {
      await syncLogin(serverId, waypoint.login);
    } catch (syncError) {
      console.error("Error syncing login:", syncError);

      await db.users.create({
        data: { login: waypoint.login, nickName: waypoint.login, path: "" },
      });
    }

    await createRecord();
  }
}

export async function saveRoundRecords(
  serverId: string,
  matchId: string | null,
  scores: Scores,
  round: number | null = null,
): Promise<void> {
  const redis = await getRedisClient();
  const key = getKeyActiveMap(serverId);

  const activeMap = await redis.get(key);
  if (!activeMap) {
    throw new Error(`No active map found for server ${serverId}`);
  }

  const mapData: Maps = JSON.parse(activeMap);
  if (!mapData) {
    throw new Error(`Map data is invalid for server ${serverId}`);
  }

  const db = getClient();

  const createRecord = async (player: Player) => {
    if (matchId !== null && round !== null) {
      // Only upsert if both matchId and round are provided
      await db.records.upsert({
        where: {
          matchId_login_round: {
            login: player.login,
            matchId,
            round,
          },
        },
        update: {
          mapId: mapData.id,
          mapUid: mapData.uid,
          time: player.prevracetime,
          checkpoints: player.prevracecheckpoints || [],
          points: player.roundpoints,
        },
        create: {
          mapId: mapData.id,
          mapUid: mapData.uid,
          login: player.login,
          time: player.prevracetime,
          checkpoints: player.prevracecheckpoints || [],
          round,
          points: player.roundpoints,
          matchId,
          serverId,
        },
      });
    } else {
      // Otherwise, just create a new record
      await db.records.create({
        data: {
          mapId: mapData.id,
          mapUid: mapData.uid,
          login: player.login,
          time: player.prevracetime,
          checkpoints: player.prevracecheckpoints || [],
          round,
          points: player.roundpoints,
          matchId,
          serverId,
        },
      });
    }
  };

  for (const player of scores.players) {
    try {
      await createRecord(player);
    } catch (error) {
      console.error("Error saving record:", error);

      try {
        await syncLogin(serverId, player.login);
      } catch (syncError) {
        console.error("Error syncing login:", syncError);

        await db.users.create({
          data: { login: player.login, nickName: player.login, path: "" },
        });
      }

      await createRecord(player);
    }
  }
}
