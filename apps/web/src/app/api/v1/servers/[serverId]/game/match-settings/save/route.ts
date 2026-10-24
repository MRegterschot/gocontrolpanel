import { matchSettingsFileAs } from "@/actions/gbx/server-only/game";
import { publicApiRoute } from "@/lib/public-api/route";
import { saveMatchSettings } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  saveMatchSettings,
  async ({ actor, params, body }) => {
    await matchSettingsFileAs(actor, params.serverId, "save", body.filename);
  },
);
