import { doServerActionWithAuth } from "@/lib/actions";
import { getAccountNames, searchAccountNames } from "@/lib/api/nadeo";
import { getClient } from "@/lib/dbclient";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { Prisma, Users } from "@tmcp/db";
import { PaginationState } from "@tanstack/react-table";
import "server-only";
import slugid from "slugid";

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
          id: { in: ids },
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

      const foundUsers = await db.users.findMany({
        where: {
          login: { in: logins },
        },
        select: {
          id: true,
          login: true,
          nickName: true,
        },
      });

      const missingLogins = logins.filter(
        (login) => !foundUsers.some((user) => user.login === login),
      );

      if (missingLogins.length > 0) {
        const accountNames = await getAccountNames(
          missingLogins.map((login) => slugid.decode(login)),
        );

        if (accountNames && Object.keys(accountNames).length > 0) {
          await db.users.createMany({
            data: Object.entries(accountNames).map(
              ([accountId, accountName]) => ({
                login: slugid.encode(accountId),
                nickName: accountName,
                path: "",
              }),
            ),
            skipDuplicates: true,
          });
        }
      }

      return await db.users.findMany({
        where: {
          login: { in: logins },
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

      return await db.users.findFirst({
        where: {
          OR: [{ login: search }, { nickName: search }],
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
