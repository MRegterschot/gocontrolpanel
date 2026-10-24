import { publicApiRoute } from "@/lib/public-api/route";
import { getJoinLinkAs } from "@/services/gbx/advanced";
import { getJoinLink } from "@gcp/shared/public-api";

export const GET = publicApiRoute(getJoinLink, async ({ actor, params }) => ({
  data: { link: await getJoinLinkAs(actor, params.serverId) },
}));
