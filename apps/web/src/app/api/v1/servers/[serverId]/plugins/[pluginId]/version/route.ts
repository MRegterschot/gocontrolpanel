import { changeMarketplacePluginVersionAs } from "@/actions/server-only/plugins";
import { publicApiRoute } from "@/lib/public-api/route";
import { changePluginVersion } from "@tmcontrolpanel/shared/public-api";

export const PUT = publicApiRoute(
  changePluginVersion,
  async ({ actor, params, body }) => {
    await changeMarketplacePluginVersionAs(
      actor,
      params.serverId,
      params.pluginId,
      body.version,
      body.acceptedCapabilities,
    );
  },
);
