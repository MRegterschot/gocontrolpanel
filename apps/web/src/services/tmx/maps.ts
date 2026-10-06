import { logAudit } from "@/actions/database/server-only/audit-logs";
import { doServerActionWithAuth } from "@/lib/actions";
import { searchTMXMaps } from "@/lib/api/tmx";
import { TMXMapSearch } from "@/types/api/tmx";
import { ServerResponse } from "@/types/responses";
import "server-only";

export async function searchMaps(
  serverId: string,
  queryParams: Record<string, string>,
  after?: number,
  count: number = 12,
): Promise<ServerResponse<TMXMapSearch>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      await logAudit(session.user.id, serverId, "server.tmx.map.search", {
        queryParams,
        after,
      });

      return searchTMXMaps(
        {
          ...queryParams,
          ...(after ? { after: after.toString() } : {}),
        },
        count,
      );
    },
  );
}
