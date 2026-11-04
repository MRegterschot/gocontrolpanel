import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { gbxService } from "@/lib/gbx-service";
import { routePermissions } from "@/routes";
import { ServerError } from "@/types/responses";
import "server-only";

export async function getCluster() {
  return doServerActionWithAuth(
    routePermissions.admin.servers.clients.view,
    async (session) => {
      if (!session.user.admin)
        throw new ServerError("Unauthorized", "Unauthorized");
      const [overview, servers] = await Promise.all([
        gbxService.clusterOverview(),
        getClient().servers.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true },
        }),
      ]);
      const states = new Map(overview.servers.map((s) => [s.serverId, s]));
      return {
        mode: overview.mode,
        workers: overview.workers,
        servers: servers.map((server) => {
          const state = states.get(server.id);
          return {
            ...server,
            owner: state?.owner ?? null,
            leaseTtlMs: state?.leaseTtlMs ?? null,
            held: state?.held ?? false,
            status: state?.status ?? null,
          };
        }),
      };
    },
  );
}
