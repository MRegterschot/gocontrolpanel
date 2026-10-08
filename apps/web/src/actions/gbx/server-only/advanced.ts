import { type Actor, requirePermission } from "@/lib/actor";
import { gbxService } from "@/lib/gbx-service";
import { serverPermissions } from "@gcp/shared";
import "server-only";
import { logAudit } from "../../database/server-only/audit-logs";

// Advanced operations for an actor; the Server Actions and Codriver both call these

export async function sendChatMessageAs(
  actor: Actor,
  serverId: string,
  message: string,
  login?: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  // Get the user's role for the given server
  const role =
    actor.claims.servers.find((s) => s.id === serverId)?.role === "Admin" ||
    actor.claims.groups
      .filter((g) => g.servers.some((s) => s.id === serverId))
      .some((g) => g.role === "Admin")
      ? "Admin"
      : "Moderator";

  const roleColor = role === "Admin" ? "D00" : "FC0";
  const fullMessage = `$z[$${roleColor}${role}$z] ${actor.displayName}: ${message.trim()}`;

  await gbxService.sendChat(serverId, fullMessage, login);

  await logAudit(actor.userId, serverId, "server.live.chat.send", message);
}
