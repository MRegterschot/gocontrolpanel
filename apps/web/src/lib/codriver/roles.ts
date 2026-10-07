import { type Actor, actorHasPermission } from "@/lib/actor";
import { serverPermissions } from "@gcp/shared";
import "server-only";
import type { CodriverRole } from "./types";

const memberPermissions = ["servers:id:member", "group:servers:id:member"];

// The caller's highest role on the server; panel admins count as server admins
export function resolveRole(actor: Actor, serverId: string): CodriverRole {
  if (actorHasPermission(actor, serverPermissions.admin, serverId))
    return "admin";
  if (actorHasPermission(actor, serverPermissions.moderator, serverId)) {
    return "moderator";
  }
  if (actorHasPermission(actor, memberPermissions, serverId)) return "member";
  return "guest";
}
