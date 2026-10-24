import { setServerPluginVariablesAs } from "@/actions/gbx/server-only/server-plugin";
import { publicApiRoute } from "@/lib/public-api/route";
import { setServerScriptPluginVariables } from "@gcp/shared/public-api";

export const PATCH = publicApiRoute(
  setServerScriptPluginVariables,
  async ({ actor, params, body }) => {
    await setServerPluginVariablesAs(actor, params.serverId, body.variables);
  },
);
