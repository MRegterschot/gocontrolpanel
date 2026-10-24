import { toApiMapInfo } from "@/lib/public-api/dto";
import { publicApiRoute } from "@/lib/public-api/route";
import { getLocalMapsAs } from "@/services/gbx/server";
import { listMapFiles } from "@gcp/shared/public-api";

export const GET = publicApiRoute(listMapFiles, async ({ actor, params }) => {
  const maps = await getLocalMapsAs(actor, params.serverId);
  return { data: maps.map(toApiMapInfo) };
});
