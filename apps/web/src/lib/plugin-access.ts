import { getAdminServerIds, type SessionClaims } from "@tmcp/shared";
import type { Session } from "next-auth";
import "server-only";
import { getClient } from "./dbclient";

export interface ServerSummary {
  id: string;
  name: string;
}

// Servers the user may install plugins on: every server for panel admins, otherwise the ones
// they are Admin of directly or through a group
export async function getAdminServers(session: Session): Promise<ServerSummary[]> {
  const db = getClient();
  if (session.user.admin) {
    return db.servers.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  const ids = getAdminServerIds(session.user as unknown as SessionClaims);
  if (ids.size === 0) return [];
  return db.servers.findMany({
    where: { id: { in: [...ids] }, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export function canUploadPlugins(session: Session): boolean {
  return session.user.admin || session.user.permissions.includes("plugins:upload");
}

// Private uploads belong to the uploader; panel admins see and manage all of them
export function uploadOwnerFilter(session: Session): { ownerId?: string } {
  return session.user.admin ? {} : { ownerId: session.user.id };
}
