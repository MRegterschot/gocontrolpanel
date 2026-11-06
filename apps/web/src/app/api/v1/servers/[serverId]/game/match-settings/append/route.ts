import { matchSettingsFileAs } from "@/actions/gbx/server-only/game";
import { publicApiRoute } from "@/lib/public-api/route";
import { appendPlaylist } from "@tmcontrolpanel/shared/public-api";

export const POST = publicApiRoute(
  appendPlaylist,
  async ({ actor, params, body }) => {
    await matchSettingsFileAs(actor, params.serverId, "append", body.filename);
  },
);
