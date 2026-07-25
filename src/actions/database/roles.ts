"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { Prisma, Roles } from "@/lib/prisma/generated";
import { getList } from "@/lib/utils";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { logAudit } from "./server-only/audit-logs";

export type RoleMinimal = Pick<Roles, "id" | "name" | "permissions">;

export async function getRolesMinimal(): Promise<
  ServerResponse<RoleMinimal[]>
> {
  return doServerActionWithAuth(["users:edit"], async () => {
    const db = getClient();

    return await db.roles.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        permissions: true,
      },
    });
  });
}

export async function getRolesPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter?: string,
): Promise<ServerResponse<PaginationResponse<Roles>>> {
  return doServerActionWithAuth(["roles:view"], async () => {
    const db = getClient();

    const where: Prisma.RolesWhereInput = {
      deletedAt: null,
      ...(filter && {
        OR: [
          { name: { contains: filter } },
          { permissions: { array_contains: [filter] } },
        ],
      }),
    };

    const totalCount = await db.roles.count({
      where,
    });

    const roles = await db.roles.findMany({
      where,
      skip: pagination.pageIndex * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: {
        [sorting.field]: sorting.order,
      },
    });

    return {
      data: roles,
      totalCount,
    };
  });
}

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
