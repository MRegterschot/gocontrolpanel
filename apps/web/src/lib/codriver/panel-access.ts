import { actorForLogin, requirePermission, type Actor } from "@/lib/actor";
import { getClient } from "@/lib/dbclient";
import { ServerError } from "@/types/responses";
import type { Session } from "next-auth";
import "server-only";

export const codriverChatPermissions = [
  "servers:id:member",
  "servers:id:moderator",
  "servers:id:admin",
  "group:servers:id:member",
  "group:servers:id:moderator",
  "group:servers:id:admin",
];

export async function requireActiveServer(serverId: string): Promise<void> {
  if (
    !(await getClient().servers.findFirst({
      where: { id: serverId, deletedAt: null },
      select: { id: true },
    }))
  ) {
    throw new ServerError("Server not found", "ServerNotFound");
  }
}

// Refresh roles for every panel message, including confirmation; never accept a caller from the browser.
export async function panelChatActor(
  session: Session,
  serverId: string,
): Promise<Actor> {
  const actor = await actorForLogin(session.user.login);
  if (!actor.userId || actor.userId !== session.user.id)
    throw new ServerError("Unauthorized", "Unauthorized");
  requirePermission(actor, codriverChatPermissions, serverId);
  await requireActiveServer(serverId);
  return actor;
}
