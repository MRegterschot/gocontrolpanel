import { doServerActionWithAuth } from "@/lib/actions";
import { requireActiveServer } from "@/lib/codriver/panel-access";
import { usageAccumulator } from "@/lib/codriver/statistics";
import { monthStart } from "@/lib/codriver/usage";
import { getClient } from "@/lib/dbclient";
import { requirePanelAdmin, serverAdminPermissions } from "@/services/codriver";
import "server-only";

export async function getCodriverUsage(serverId?: string) {
  return doServerActionWithAuth(
    serverId ? serverAdminPermissions(serverId) : [],
    async (session) => {
      if (serverId) await requireActiveServer(serverId);
      else requirePanelAdmin(session);
      const db = getClient();
      const now = new Date();
      const servers = await db.servers.findMany({
        where: { ...(serverId ? { id: serverId } : {}), deletedAt: null },
        select: {
          id: true,
          name: true,
          groupServers: {
            where: { group: { deletedAt: null } },
            select: { group: { select: { id: true, name: true } } },
          },
        },
      });
      const accumulator = usageAccumulator(
        now,
        servers.map((server) => ({
          ...server,
          groups: server.groupServers.map((entry) => entry.group),
        })),
      );
      let cursor: string | undefined;
      for (;;) {
        const rows = await db.codriverRequests.findMany({
          where: {
            ...(serverId ? { serverId } : {}),
            server: { deletedAt: null },
            createdAt: { gte: monthStart(now), lte: now },
          },
          select: {
            id: true,
            serverId: true,
            createdAt: true,
            status: true,
            keySource: true,
            model: true,
            modelCalls: true,
            costMicros: true,
            toolCalls: true,
          },
          orderBy: { id: "asc" },
          take: 1000,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        accumulator.add(rows);
        if (rows.length < 1000) break;
        cursor = rows[rows.length - 1].id;
      }
      return accumulator.result();
    },
  );
}
