import { toApiMap } from "@/lib/public-api/dto";
import { publicApiRoute } from "@/lib/public-api/route";
import { getMapListAs } from "@/services/database/maps";
import { ServerError } from "@/types/responses";
import { listMaps } from "@gcp/shared/public-api";

export const GET = publicApiRoute(
  listMaps,
  async ({ actor, params, query }) => {
    try {
      const maps = await getMapListAs(
        actor,
        params.serverId,
        query.limit,
        query.offset,
      );
      return { data: maps.map(toApiMap) };
    } catch (error) {
      // The panel treats an empty list as a failure; to the API it is just empty
      if (error instanceof ServerError && error.name === "MapListEmpty") {
        return { data: [] };
      }
      throw error;
    }
  },
);
