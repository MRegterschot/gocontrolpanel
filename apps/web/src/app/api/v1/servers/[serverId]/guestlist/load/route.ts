import { playerListFileAs } from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { loadGuestlist } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  loadGuestlist,
  async ({ actor, params, body }) => {
    await playerListFileAs(
      actor,
      params.serverId,
      "guestlist",
      "load",
      body.filename,
    );
  },
);
