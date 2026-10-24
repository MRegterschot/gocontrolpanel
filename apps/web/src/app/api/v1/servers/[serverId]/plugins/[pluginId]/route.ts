import { uninstallServerPluginAs } from "@/actions/server-only/plugins";
import { publicApiRoute } from "@/lib/public-api/route";
import { uninstallPlugin } from "@gcp/shared/public-api";

export const DELETE = publicApiRoute(
  uninstallPlugin,
  async ({ actor, params }) => {
    await uninstallServerPluginAs(actor, params.serverId, params.pluginId);
  },
);
