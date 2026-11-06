import { toApiMapInfo } from "@/lib/public-api/dto";
import { publicApiRoute } from "@/lib/public-api/route";
import { getCurrentMapsAs } from "@/services/gbx/map";
import { getCurrentMaps } from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(getCurrentMaps, async ({ actor, params }) => {
  const { current, next } = await getCurrentMapsAs(actor, params.serverId);
  return {
    data: { current: toApiMapInfo(current), next: toApiMapInfo(next) },
  };
});
