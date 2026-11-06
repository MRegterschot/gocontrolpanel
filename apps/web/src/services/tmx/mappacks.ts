import { logAudit } from "@/actions/database/server-only/audit-logs";
import { doServerActionWithAuth } from "@/lib/actions";
import { searchTMXMappacks } from "@/lib/api/tmx";
import { TMXMappackSearch } from "@/types/api/tmx";
import { ServerResponse } from "@/types/responses";
import "server-only";

export async function searchMappacks(
  serverId: string,
  queryParams: Record<string, string>,
  after?: number,
): Promise<ServerResponse<TMXMappackSearch>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      await logAudit(session.user.id, serverId, "server.tmx.mappack.search", {
        queryParams,
        after,
      });

      return searchTMXMappacks(
        {
          ...queryParams,
          ...(after ? { after: after.toString() } : {}),
        },
        12,
      );
    },
  );
}
