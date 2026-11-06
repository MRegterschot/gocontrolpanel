import { triggerModeScriptEventAs } from "@/actions/gbx/server-only/game";
import { publicApiRoute } from "@/lib/public-api/route";
import { triggerScriptEvent } from "@tmcontrolpanel/shared/public-api";

export const POST = publicApiRoute(
  triggerScriptEvent,
  async ({ actor, params, body }) => {
    await triggerModeScriptEventAs(
      actor,
      params.serverId,
      body.method,
      body.params,
    );
  },
);
