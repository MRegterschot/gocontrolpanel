"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { ServerError, ServerResponse } from "@/types/responses";
import { auditLogData } from "./server-only/audit-logs";

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
      const deletedAt = new Date();

      // The match must belong to the server the caller was authorized for
      await getClient().$transaction(async (tx) => {
        const { count } = await tx.matches.updateMany({
          where: { id: matchId, serverId, deletedAt: null },
          data: { deletedAt },
        });
        if (count === 0) {
          throw new ServerError("Match not found", "MatchNotFound");
        }

        await tx.records.updateMany({
          where: { matchId, deletedAt: null },
          data: { deletedAt },
        });

        await tx.auditLogs.create({
          data: auditLogData(
            session.user.id,
            serverId,
            "server.records.match.delete",
            matchId,
          ),
        });
      });
    },
  );
}
