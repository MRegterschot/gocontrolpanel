"use server";
import { searchAccountNames } from "@/lib/api/nadeo";
import { getRedisClient } from "@/lib/redis";
import type { UserMinimal } from "@/services/database/users";
import slugid from "slugid";
import { z } from "zod";

import { doServerActionWithAuth } from "@/lib/actions";
import { parseInput, updateUserInput } from "@/lib/admin-inputs";
import { getClient } from "@/lib/dbclient";
import { getList } from "@/lib/utils";
import { ServerError, ServerResponse } from "@/types/responses";
import { Users } from "@gcp/db";
import { logAudit, withAudit } from "./server-only/audit-logs";

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
    const input = parseInput(updateUserInput, data);

    const target = await db.users.findUnique({
      where: { id: userId, deletedAt: null },
      select: { admin: true, permissions: true },
    });
    if (!target) throw new ServerError("User not found", "UserNotFound");

    const permissions = [...new Set(input.permissions)];
    if (!session.user.admin) {
      // Delegated user managers can't create admins or grant more than they hold
      if (userId === session.user.id || target.admin || input.admin) {
        throw new ServerError(
          "Only admins can edit admins, grant admin, or edit themselves",
          "Unauthorized",
        );
      }
      const current = getList<string>(target.permissions);
      const own = new Set(session.user.permissions);
      const changed = [
        ...permissions.filter((p) => !current.includes(p)),
        ...current.filter((p) => !permissions.includes(p)),
      ];
      if (changed.some((p) => !own.has(p))) {
        throw new ServerError(
          "You can only grant or remove permissions you have yourself",
          "Unauthorized",
        );
      }
    }

    await withAudit(
      (tx) =>
        tx.users.update({
          where: { id: userId, deletedAt: null },
          data: { admin: input.admin, permissions },
        }),
      () => [
        session.user.id,
        userId,
        "user.edit",
        {
          admin: input.admin,
          permissions,
        },
      ],
    );
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
      throw new ServerError(
        "Cannot delete your own account",
        "CannotDeleteOwnAccount",
      );
    }

    await withAudit(
      (tx) =>
        tx.users.update({
          where: {
            id: userId,
            deletedAt: null,
            ...(!session.user.admin && { admin: false }),
          },
          data: {
            deletedAt: new Date(),
            authenticated: false,
            admin: false,
            permissions: [],
          },
        }),
      () => [session.user.id, userId, "user.delete"],
    );
  });
}

export async function searchAndImportUser(
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
    async (session) => {
      search = z.string().trim().min(1).max(100).parse(search);
      const redis = await getRedisClient();
      const count = await redis.eval(
        "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 60) end; return n",
        1,
        `users:import:${session.user.id}`,
      );
      if (Number(count) > 30)
        throw new ServerError(
          "Too many user searches; try again shortly",
          "RateLimited",
        );
      const db = getClient();

      const user = await db.users.findFirst({
        where: {
          deletedAt: null,
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
          deletedAt: null,
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
