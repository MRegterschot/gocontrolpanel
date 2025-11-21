"use server";
import { doServerActionWithAuth } from "@/lib/actions";
import { searchAccountNames } from "@/lib/api/nadeo";
import { getClient } from "@/lib/dbclient";
import { Prisma, Users } from "@/lib/prisma/generated";
import { getList } from "@/lib/utils";
import {
  PaginationResponse,
  ServerError,
  ServerResponse,
} from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import slugid from "slugid";
import { logAudit } from "./server-only/audit-logs";

export type UserMinimal = Pick<Users, "id" | "login" | "nickName">;

export async function getUsersMinimal(): Promise<
  ServerResponse<UserMinimal[]>
> {
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
      const users = await db.users.findMany({
        select: {
          id: true,
          login: true,
          nickName: true,
        },
      });

      return users;
    },
  );
}

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
      const users = await db.users.findMany({
        where: {
          id: { in: ids },
        },
        select: {
          id: true,
          login: true,
          nickName: true,
        },
      });

      return users;
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
      const users = await db.users.findMany({
        where: {
          login: { in: logins },
        },
        select: {
          id: true,
          login: true,
          nickName: true,
        },
      });

      return users;
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

export async function updateUser(
  userId: string,
  data: Omit<
    Users,
    | "id"
    | "login"
    | "nickName"
    | "path"
    | "ubiUid"
    | "authenticated"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  >,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["users:edit"], async (session) => {
    const db = getClient();

    await db.users.update({
      where: { id: userId },
      data: {
        ...data,
        permissions: getList<string>(data.permissions),
      },
    });

    await logAudit(session.user.id, userId, "user.edit", data);
  });
}

export async function deleteUserById(userId: string): Promise<ServerResponse> {
  return doServerActionWithAuth(["users:delete"], async (session) => {
    if (userId === session.user.id) {
      await logAudit(
        session.user.id,
        userId,
        "user.delete",
        undefined,
        "Cannot delete your own account",
      );
      throw new ServerError("Cannot delete your own account");
    }

    const db = getClient();
    await db.users.delete({
      where: { id: userId },
    });

    await logAudit(session.user.id, userId, "user.delete");
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
      const db = getClient();

      const user = await db.users.findFirst({
        where: {
          OR: [{ login: { equals: search } }, { nickName: { equals: search } }],
        },
        select: {
          id: true,
          login: true,
          nickName: true,
        },
      });

      if (user) {
        return user;
      }

      if (search.length > 3) {
        const { data: accountNames, error } = await searchAccountNames([
          search,
        ]);

        if (!error && accountNames && Object.keys(accountNames).length > 0) {
          await db.users.createMany({
            data: Object.entries(accountNames).map(
              ([accountName, accountId]) => ({
                login: slugid.encode(accountId),
                nickName: accountName,
                path: "",
              }),
            ),
            skipDuplicates: true,
          });
        }
      }

      const newUser = await db.users.findFirst({
        where: {
          OR: [{ login: search }, { nickName: search }],
        },
        select: {
          id: true,
          login: true,
          nickName: true,
        },
      });

      return newUser;
    },
  );
}
