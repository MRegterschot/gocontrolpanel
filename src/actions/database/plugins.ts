"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { Plugins } from "@/lib/prisma/generated";
import { ServerResponse } from "@/types/responses";

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
