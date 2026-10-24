import { matchSettingsFileAs } from "@/actions/gbx/server-only/game";
import { publicApiRoute } from "@/lib/public-api/route";
import { insertPlaylist } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  insertPlaylist,
  async ({ actor, params, body }) => {
    await matchSettingsFileAs(actor, params.serverId, "insert", body.filename);
  },
);
