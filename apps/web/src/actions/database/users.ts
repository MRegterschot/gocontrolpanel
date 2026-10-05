"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { Users } from "@tmcp/db";
import { getList } from "@/lib/utils";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "./server-only/audit-logs";

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
      throw new ServerError("Cannot delete your own account", "CannotDeleteOwnAccount");
    }

    const db = getClient();

    await db.users.delete({
      where: { id: userId },
    });

    await logAudit(session.user.id, userId, "user.delete");
  });
}
