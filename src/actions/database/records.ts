"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { Records } from "@/lib/prisma/generated";
import { ServerResponse } from "@/types/responses";

export async function exportRecords(
  serverId: string,
  mapUid?: string,
): Promise<ServerResponse<Records[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:member`,
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:member`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const db = getClient();

      const records = await db.records.findMany({
        where: {
          serverId,
          mapUid,
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return records;
    },
  );
}
