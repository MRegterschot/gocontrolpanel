import { triggerServerPluginEventAs } from "@/actions/gbx/server-only/server-plugin";
import { publicApiRoute } from "@/lib/public-api/route";
import { triggerServerScriptPluginEvent } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  triggerServerScriptPluginEvent,
  async ({ actor, params, body }) => {
    await triggerServerPluginEventAs(
      actor,
      params.serverId,
      body.name,
      body.params,
    );
  },
);
