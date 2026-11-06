import { type Actor, requirePermission } from "@/lib/actor";
import { gbxService, getGbxClient } from "@/lib/gbx-service";
import { getLogger } from "@/lib/logger";
import { getKeyJukebox, getRedisClient } from "@/lib/redis";
import { getErrorMessage } from "@/lib/utils";
import { JukeboxMap } from "@/types/map";
import { Maps, Prisma } from "@tmcontrolpanel/db";
import { serverPermissions } from "@tmcontrolpanel/shared";
import "server-only";
import { logAudit } from "../../database/server-only/audit-logs";

// Jukebox operations for an actor; the Server Actions and Codriver both call these

export async function addMapToJukeboxAs(
  actor: Actor,
  serverId: string,
  map: Maps,
): Promise<JukeboxMap> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const redis = await getRedisClient();
  const newMap: JukeboxMap = {
    ...map,
    QueuedAt: new Date(),
    QueuedBy: actor.login,
    QueuedByDisplayName: actor.displayName,
  };

  await redis.rpush(getKeyJukebox(serverId), JSON.stringify(newMap));

  await logAudit(
    actor.userId,
    serverId,
    "server.maps.jukebox.add",
    JSON.parse(JSON.stringify(newMap)),
  );

  return newMap;
}

export async function clearJukeboxAs(
  actor: Actor,
  serverId: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const redis = await getRedisClient();
  await redis.del(getKeyJukebox(serverId));
  await logAudit(actor.userId, serverId, "server.maps.jukebox.clear");
}

// Replaces the whole jukebox, for reordering or removing several entries at once
export async function setJukeboxAs(
  actor: Actor,
  serverId: string,
  jukebox: JukeboxMap[],
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const redis = await getRedisClient();
  const key = getKeyJukebox(serverId);
  await redis.del(key);
  if (jukebox.length > 0) {
    await redis.rpush(key, ...jukebox.map((map) => JSON.stringify(map)));
  }
  await logAudit(
    actor.userId,
    serverId,
    "server.maps.jukebox.set",
    JSON.parse(JSON.stringify(jukebox)),
  );
}

// Removes every jukebox entry of the map
export async function removeFromJukeboxAs(
  actor: Actor,
  serverId: string,
  mapId: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const redis = await getRedisClient();
  const key = getKeyJukebox(serverId);
  const items = await redis.lrange(key, 0, -1);
  const filtered = items.filter((item) => JSON.parse(item).id !== mapId);

  await redis.del(key);
  if (filtered.length > 0) {
    await redis.rpush(key, ...filtered);
  }
  await logAudit(actor.userId, serverId, "server.maps.jukebox.remove", mapId);
}

// Records a map list change in the audit log, with the error when the service rejected it
export async function auditMapListChange<T>(
  userId: string | null,
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

export async function jumpToMapIndexAs(
  actor: Actor,
  serverId: string,
  index: number,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  await client.call("JumpToMapIndex", index);
  await logAudit(actor.userId, serverId, "server.game.map.jump", index);
}

export async function removeMapsAs(
  actor: Actor,
  serverId: string,
  filenames: string[],
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  await auditMapListChange(
    actor.userId,
    serverId,
    "server.maps.maplist.remove",
    filenames,
    () => gbxService.removeMaps(serverId, filenames),
  );
}

export async function addMapAs(
  actor: Actor,
  serverId: string,
  filename: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  await auditMapListChange(
    actor.userId,
    serverId,
    "server.maps.maplist.add",
    filename,
    () => gbxService.addMaps(serverId, [filename]),
  );
}

// Adds map files to the map list; returns how many the server accepted
export async function addMapsAs(
  actor: Actor,
  serverId: string,
  filenames: string[],
): Promise<number> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  try {
    const { count } = await gbxService.addMaps(serverId, filenames);
    await logAudit(actor.userId, serverId, "server.maps.maplist.add", {
      filenames,
      addedCount: count,
    });
    return count;
  } catch (error) {
    await logAudit(
      actor.userId,
      serverId,
      "server.maps.maplist.add",
      { filenames, addedCount: 0 },
      getErrorMessage(error),
    );
    getLogger(serverId).error(
      {
        meta: { type: "gbx", module: "game", function: "addMapList" },
        error,
        filenames,
      },
      "Failed to add map list",
    );
    throw error;
  }
}

// Moves the given maps to the end of the map list, in the given order
export async function reorderMapsAs(
  actor: Actor,
  serverId: string,
  filenames: string[],
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  try {
    await auditMapListChange(
      actor.userId,
      serverId,
      "server.maps.maplist.reorder",
      filenames,
      () => gbxService.reorderMaps(serverId, filenames),
    );
  } catch (error) {
    getLogger(serverId).error(
      {
        meta: { type: "gbx", module: "game", function: "reorderMapList" },
        error,
        filenames,
      },
      "Failed to reorder map list",
    );
    throw error;
  }
}
