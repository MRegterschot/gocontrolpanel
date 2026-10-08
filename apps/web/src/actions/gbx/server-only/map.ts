import { type Actor, requirePermission } from "@/lib/actor";
import { gbxService, getGbxClient } from "@/lib/gbx-service";
import { getKeyJukebox, getRedisClient } from "@/lib/redis";
import { getErrorMessage } from "@/lib/utils";
import { JukeboxMap } from "@/types/map";
import { Maps, Prisma } from "@gcp/db";
import { serverPermissions } from "@gcp/shared";
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
