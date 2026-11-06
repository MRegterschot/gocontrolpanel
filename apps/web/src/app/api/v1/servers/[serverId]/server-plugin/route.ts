import {
  getServerPluginAs,
  setServerPluginAs,
} from "@/actions/gbx/server-only/server-plugin";
import { toApiServerScriptPlugin } from "@/lib/public-api/dto";
import { publicApiRoute } from "@/lib/public-api/route";
import {
  getServerScriptPlugin,
  setServerScriptPlugin,
} from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(
  getServerScriptPlugin,
  async ({ actor, params }) => {
    const plugin = await getServerPluginAs(actor, params.serverId);
    return { data: toApiServerScriptPlugin(plugin) };
  },
);

export const PUT = publicApiRoute(
  setServerScriptPlugin,
  async ({ actor, params, body }) => {
    await setServerPluginAs(
      actor,
      params.serverId,
      body.forceReload,
      body.name,
      body.settings,
    );
  },
);
