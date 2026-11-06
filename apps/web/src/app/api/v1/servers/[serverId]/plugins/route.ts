import { installMarketplacePluginAs } from "@/actions/server-only/plugins";
import { toApiInstalledPlugin } from "@/lib/public-api/dto";
import { publicApiRoute } from "@/lib/public-api/route";
import { getInstalledPluginsAs } from "@/services/plugins";
import { installPlugin, listPlugins } from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(listPlugins, async ({ actor, params }) => {
  const plugins = await getInstalledPluginsAs(actor, params.serverId);
  return { data: plugins.map(toApiInstalledPlugin) };
});

export const POST = publicApiRoute(
  installPlugin,
  async ({ actor, params, body }) => {
    await installMarketplacePluginAs(
      actor,
      params.serverId,
      body.slug,
      body.version,
      body.acceptedCapabilities,
    );
  },
);
