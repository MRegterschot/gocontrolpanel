"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "./server-only/audit-logs";

export async function deleteMatch(
  serverId: string,
  matchId: string,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const db = getClient();

      await db.matches.update({
        where: { id: matchId },
        data: { deletedAt: new Date() },
      });

      // Delete the records associated with the match
      await db.records.updateMany({
        where: { matchId },
        data: { deletedAt: new Date() },
      });

      await logAudit(
        session.user.id,
        serverId,
        "server.records.match.delete",
        matchId,
      );
    },
  );
}
