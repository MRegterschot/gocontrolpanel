"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { HetznerServers } from "@/lib/prisma/generated";
import { ServerResponse } from "@/types/responses";

export async function getDBHetznerServer(
  projectId: string,
  hetznerId: number,
): Promise<ServerResponse<HetznerServers | null>> {
  return doServerActionWithAuth(
    [
      "hetzner:servers:view",
      `hetzner:${projectId}:moderator`,
      `hetzner:${projectId}:admin`,
    ],
    async () => {
      const db = getClient();

      return await db.hetznerServers.findUnique({
        where: { hetznerId },
      });
    },
  );
}
