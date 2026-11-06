import { reloadServerPluginsAs } from "@/actions/server-only/plugins";
import { publicApiRoute } from "@/lib/public-api/route";
import { reloadPlugins } from "@tmcontrolpanel/shared/public-api";

export const POST = publicApiRoute(reloadPlugins, async ({ actor, params }) => {
  await reloadServerPluginsAs(actor, params.serverId);
});
