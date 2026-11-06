import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { Prisma, Users } from "@tmcontrolpanel/db";
import "server-only";
import { z } from "zod";

export type UserMinimal = Pick<Users, "id" | "login" | "nickName">;

export async function getUsersByIds(
  ids: string[],
): Promise<ServerResponse<UserMinimal[]>> {
  return doServerActionWithAuth(
    [
      "groups:create",
      "groups:edit",
      "groups::admin",
      "servers:create",
      "servers:edit",
      "servers::admin",
      "hetzner:create",
      "hetzner:edit",
      "hetzner::admin",
    ],
    async () => {
      const db = getClient();

      return await db.users.findMany({
        where: {
          id: { in: z.array(z.string().min(1).max(64)).max(100).parse(ids) },
          deletedAt: null,
        },
        select: {
          id: true,
          login: true,
          nickName: true,
        },
      });
    },
  );
}

export async function getUsersByLogins(
  logins: string[],
): Promise<ServerResponse<UserMinimal[]>> {
  return doServerActionWithAuth(
    [
      "groups:create",
      "groups:edit",
      "groups::admin",
      "servers:create",
      "servers:edit",
      "servers::admin",
      "hetzner:create",
      "hetzner:edit",
      "hetzner::admin",
    ],
    async () => {
      const db = getClient();

      logins = z
        .array(z.string().regex(/^[A-Za-z0-9_-]{22}$/))
        .max(100)
        .parse(logins);
      const foundUsers = await db.users.findMany({
        where: {
          login: { in: logins },
          deletedAt: null,
        },
        select: {
          id: true,
          login: true,
          nickName: true,
        },
      });

      return foundUsers;
    },
  );
}

export async function getUsersPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter?: string,
): Promise<ServerResponse<PaginationResponse<Users>>> {
  return doServerActionWithAuth(["users:view"], async () => {
    const db = getClient();

    const where: Prisma.UsersWhereInput = {
      authenticated: true,
      deletedAt: null,
      ...(filter && {
        OR: [
          { login: { contains: filter } },
          { nickName: { contains: filter } },
          { ubiUid: { contains: filter } },
          { path: { contains: filter } },
        ],
      }),
    };

    const totalCount = await db.users.count({
      where,
    });

    const users = await db.users.findMany({
      where,
      skip: pagination.pageIndex * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: {
        [sorting.field]: sorting.order.toLowerCase(),
      },
    });

    return {
      data: users,
      totalCount,
    };
  });
}

export async function searchUser(
  search: string,
): Promise<ServerResponse<UserMinimal | null>> {
  return doServerActionWithAuth(
    [
      "groups:create",
      "groups:edit",
      "groups::admin",
      "servers:create",
      "servers:edit",
      "servers::admin",
      "hetzner:create",
      "hetzner:edit",
      "hetzner::admin",
    ],
    async () => {
      const value = z.string().trim().min(1).max(100).parse(search);
      return getClient().users.findFirst({
        where: { deletedAt: null, OR: [{ login: value }, { nickName: value }] },
        select: { id: true, login: true, nickName: true },
      });
    },
  );
}
