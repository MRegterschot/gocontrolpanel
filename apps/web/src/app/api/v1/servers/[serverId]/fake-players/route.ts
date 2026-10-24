import { connectFakePlayerAs } from "@/actions/gbx/server-only/advanced";
import { publicApiRoute } from "@/lib/public-api/route";
import { connectFakePlayer } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  connectFakePlayer,
  async ({ actor, params }) => ({
    data: { login: await connectFakePlayerAs(actor, params.serverId) },
  }),
);
