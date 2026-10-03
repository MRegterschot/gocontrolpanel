"use server";
import { doServerActionWithAuth } from "@/lib/actions";
import { gbxService, getGbxClient } from "@/lib/gbx-service";
import { getLogger } from "@/lib/logger";
import { Maps, Prisma } from "@gcp/db";
import { getKeyJukebox, getRedisClient } from "@/lib/redis";
import { getErrorMessage } from "@/lib/utils";
import { JukeboxMap } from "@/types/map";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";

export async function getJukebox(
  serverId: string,
): Promise<ServerResponse<JukeboxMap[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyJukebox(serverId);
      const items = await redis.lrange(key, 0, -1);
      return items.map((item) => JSON.parse(item));
    },
  );
}

export async function setJukebox(
  serverId: string,
  jukebox: JukeboxMap[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const redis = await getRedisClient();
      const key = getKeyJukebox(serverId);
      await redis.del(key);
      if (jukebox.length > 0) {
        await redis.rpush(key, ...jukebox.map((map) => JSON.stringify(map)));
      }
      await logAudit(
        session.user.id,
        serverId,
        "server.maps.jukebox.set",
        JSON.parse(JSON.stringify(jukebox)),
      );
    },
  );
}

export async function clearJukebox(serverId: string): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const redis = await getRedisClient();
      const key = getKeyJukebox(serverId);
      await redis.del(key);
      await logAudit(session.user.id, serverId, "server.maps.jukebox.clear");
    },
  );
}

export async function addMapToJukebox(
  serverId: string,
  map: Maps,
): Promise<ServerResponse<JukeboxMap>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const redis = await getRedisClient();
      const newMap: JukeboxMap = {
        ...map,
        QueuedAt: new Date(),
        QueuedBy: session.user.login,
        QueuedByDisplayName: session.user.displayName,
      };

      const key = getKeyJukebox(serverId);
      await redis.rpush(key, JSON.stringify(newMap));

      await logAudit(
        session.user.id,
        serverId,
        "server.maps.jukebox.add",
        JSON.parse(JSON.stringify(newMap)),
      );

      return newMap;
    },
  );
}

export async function removeMapFromJukebox(
  serverId: string,
  mapId: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const redis = await getRedisClient();
      const key = getKeyJukebox(serverId);
      const items = await redis.lrange(key, 0, -1);

      const filtered = items.filter((item) => {
        const parsed = JSON.parse(item);
        return parsed.id !== mapId;
      });

      await redis.del(key);
      if (filtered.length > 0) {
        await redis.rpush(key, ...filtered);
      }

      await logAudit(
        session.user.id,
        serverId,
        "server.maps.jukebox.remove",
        mapId,
      );
    },
  );
}

export async function getCurrentMapIndex(
  serverId: string,
): Promise<ServerResponse<number>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:member`,
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:member`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const meta = {
        type: "gbx",
        module: "game",
        function: "getCurrentMapIndex",
      };
      const log = getLogger(serverId);
      const client = getGbxClient(serverId);
      const mapIndex = await client.call("GetCurrentMapIndex");

      if (typeof mapIndex !== "number") {
        log.error({ meta, mapIndex }, "Failed to get current map index");
        throw new ServerError(
          "Failed to get current map index",
          "GetCurrentMapIndexError",
        );
      }

      return mapIndex;
    },
  );
}

export async function jumpToMap(
  serverId: string,
  index: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = getGbxClient(serverId);
      await client.call("JumpToMapIndex", index);
      await logAudit(session.user.id, serverId, "server.game.map.jump", index);
    },
  );
}

// Records a map list change in the audit log, with the error when the service rejected it
async function auditMapListChange<T>(
  userId: string,
  serverId: string,
  action: string,
  data: Prisma.InputJsonValue,
  change: () => Promise<T>,
): Promise<T> {
  try {
    const result = await change();
    await logAudit(userId, serverId, action, data);
    return result;
  } catch (error) {
    await logAudit(userId, serverId, action, data, getErrorMessage(error));
    throw error;
  }
}

export async function addMap(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      await auditMapListChange(
        session.user.id,
        serverId,
        "server.maps.maplist.add",
        filename,
        () => gbxService.addMaps(serverId, [filename]),
      );
    },
  );
}

export async function addMapList(
  serverId: string,
  filenames: string[],
): Promise<ServerResponse<number>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const meta = {
        type: "gbx",
        module: "game",
        function: "addMapList",
      };
      const log = getLogger(serverId);

      try {
        const { count } = await gbxService.addMaps(serverId, filenames);
        await logAudit(session.user.id, serverId, "server.maps.maplist.add", {
          filenames,
          addedCount: count,
        });
        return count;
      } catch (error) {
        await logAudit(
          session.user.id,
          serverId,
          "server.maps.maplist.add",
          { filenames, addedCount: 0 },
          getErrorMessage(error),
        );
        log.error({ meta, error, filenames }, "Failed to add map list");
        throw error;
      }
    },
  );
}

export async function removeMap(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      await auditMapListChange(
        session.user.id,
        serverId,
        "server.maps.maplist.remove",
        filename,
        () => gbxService.removeMaps(serverId, [filename]),
      );
    },
  );
}

export async function removeMapList(
  serverId: string,
  filenames: string[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      await auditMapListChange(
        session.user.id,
        serverId,
        "server.maps.maplist.remove",
        filenames,
        () => gbxService.removeMaps(serverId, filenames),
      );
    },
  );
}

export async function reorderMapList(
  serverId: string,
  filenames: string[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const meta = {
        type: "gbx",
        module: "game",
        function: "reorderMapList",
      };
      const log = getLogger(serverId);

      try {
        await auditMapListChange(
          session.user.id,
          serverId,
          "server.maps.maplist.reorder",
          filenames,
          () => gbxService.reorderMaps(serverId, filenames),
        );
      } catch (error) {
        log.error({ meta, error, filenames }, "Failed to reorder map list");
        throw error;
      }
    },
  );
}
