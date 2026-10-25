import { removeMapsAs } from "@/actions/gbx/server-only/map";
import { mapListOf } from "@/lib/public-api/maps";
import { notFound, publicApiRoute } from "@/lib/public-api/route";
import { removeMaps } from "@tmcontrolpanel/shared/public-api";

export const POST = publicApiRoute(
  removeMaps,
  async ({ actor, params, body }) => {
    const maps = await mapListOf(actor, params.serverId);
    const paths = body.uids.map((uid) => {
      const map = maps.find((m) => m.uid === uid);
      if (!map) throw notFound(`Map ${uid} is not on this server's map list`);
      return map.path;
    });
    await removeMapsAs(actor, params.serverId, [...new Set(paths)]);
  },
);
