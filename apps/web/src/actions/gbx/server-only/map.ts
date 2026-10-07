import { type Actor, requirePermission } from "@/lib/actor";
import { getKeyJukebox, getRedisClient } from "@/lib/redis";
import { JukeboxMap } from "@/types/map";
import { Maps } from "@gcp/db";
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
