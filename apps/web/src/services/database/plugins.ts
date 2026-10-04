import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { ServerResponse } from "@/types/responses";
import { Plugins } from "@gcp/db";
import "server-only";

export async function getPlugins(): Promise<ServerResponse<Plugins[]>> {
  return doServerActionWithAuth(
    ["servers::admin", "group:servers::admin"],
    async () => {
      const db = getClient();

      return await db.plugins.findMany({
        where: {
          deletedAt: null,
        },
      });
    },
  );
}
