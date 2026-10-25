import { setServerPluginEnabledAs } from "@/actions/server-only/plugins";
import { publicApiRoute } from "@/lib/public-api/route";
import { setPluginEnabled } from "@tmcontrolpanel/shared/public-api";

export const PUT = publicApiRoute(
  setPluginEnabled,
  async ({ actor, params, body }) => {
    await setServerPluginEnabledAs(
      actor,
      params.serverId,
      params.pluginId,
      body.enabled,
    );
  },
);
