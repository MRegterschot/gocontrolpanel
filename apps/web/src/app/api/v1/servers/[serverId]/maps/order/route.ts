import { reorderMapsAs } from "@/actions/gbx/server-only/map";
import { inUidOrder, mapListOf } from "@/lib/public-api/maps";
import { publicApiRoute } from "@/lib/public-api/route";
import { reorderMaps } from "@tmcontrolpanel/shared/public-api";

export const PUT = publicApiRoute(
  reorderMaps,
  async ({ actor, params, body }) => {
    const maps = await mapListOf(actor, params.serverId);
    const ordered = inUidOrder(maps, body.uids, (map) => map.uid);
    await reorderMapsAs(
      actor,
      params.serverId,
      ordered.map((map) => map.path),
    );
  },
);
