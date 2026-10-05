import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { Prisma, Roles } from "@tmcp/db";
import { PaginationState } from "@tanstack/react-table";
import "server-only";

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
