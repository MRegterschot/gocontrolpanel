import { playerListFileAs } from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { loadBlacklist } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  loadBlacklist,
  async ({ actor, params, body }) => {
    await playerListFileAs(
      actor,
      params.serverId,
      "blacklist",
      "load",
      body.filename,
    );
  },
);
