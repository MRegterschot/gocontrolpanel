import { playerListFileAs } from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { saveBlacklist } from "@tmcontrolpanel/shared/public-api";

export const POST = publicApiRoute(
  saveBlacklist,
  async ({ actor, params, body }) => {
    await playerListFileAs(
      actor,
      params.serverId,
      "blacklist",
      "save",
      body.filename,
    );
  },
);
