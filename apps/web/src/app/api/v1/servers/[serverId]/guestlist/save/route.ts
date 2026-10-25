import { playerListFileAs } from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { saveGuestlist } from "@tmcontrolpanel/shared/public-api";

export const POST = publicApiRoute(
  saveGuestlist,
  async ({ actor, params, body }) => {
    await playerListFileAs(
      actor,
      params.serverId,
      "guestlist",
      "save",
      body.filename,
    );
  },
);
