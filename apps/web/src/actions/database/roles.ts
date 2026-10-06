"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { Roles } from "@gcp/db";
import { getList } from "@/lib/utils";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "./server-only/audit-logs";

export async function createRole(
  role: Omit<Roles, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Promise<ServerResponse<Roles>> {
  return doServerActionWithAuth(["roles:create"], async (session) => {
    const db = getClient();

    const newRole = await db.roles.create({
      data: {
        ...role,
        permissions: getList<string>(role.permissions),
      },
    });

    await logAudit(session.user.id, newRole.id, "role.create", role);

    return newRole;
  });
}

export async function updateRole(
  roleId: string,
  role: Omit<Roles, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Promise<ServerResponse<Roles>> {
  return doServerActionWithAuth(["roles:edit"], async (session) => {
    const db = getClient();

    const updatedRole = await db.roles.update({
      where: { id: roleId },
      data: {
        ...role,
        permissions: getList<string>(role.permissions),
      },
    });

    await logAudit(session.user.id, roleId, "role.edit", role);

    return updatedRole;
  });
}

export async function deleteRole(roleId: string): Promise<ServerResponse> {
  return doServerActionWithAuth(["roles:delete"], async (session) => {
    const db = getClient();

    await db.roles.update({
      where: { id: roleId },
      data: { deletedAt: new Date() },
    });

    await logAudit(session.user.id, roleId, "role.delete");
  });
}
