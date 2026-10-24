import { nextMapAs } from "@/actions/gbx/server-only/game";
import { publicApiRoute } from "@/lib/public-api/route";
import { nextMap } from "@gcp/shared/public-api";

export const POST = publicApiRoute(nextMap, async ({ actor, params }) => {
  await nextMapAs(actor, params.serverId);
});
