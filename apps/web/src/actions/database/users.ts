"use server";

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
      where: { id: userId },
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
          where: { id: userId },
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
        tx.users.delete({
          where: { id: userId },
        }),
      () => [session.user.id, userId, "user.delete"],
    );
  });
}
