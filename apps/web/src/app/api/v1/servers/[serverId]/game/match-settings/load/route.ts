import { matchSettingsFileAs } from "@/actions/gbx/server-only/game";
import { publicApiRoute } from "@/lib/public-api/route";
import { loadMatchSettings } from "@tmcontrolpanel/shared/public-api";

export const POST = publicApiRoute(
  loadMatchSettings,
  async ({ actor, params, body }) => {
    await matchSettingsFileAs(actor, params.serverId, "load", body.filename);
  },
);
