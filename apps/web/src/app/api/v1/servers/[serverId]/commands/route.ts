import { executeCommandAs } from "@/actions/gbx/server-only/commands";
import { publicApiRoute } from "@/lib/public-api/route";
import { executeCommand } from "@tmcontrolpanel/shared/public-api";

export const POST = publicApiRoute(
  executeCommand,
  async ({ actor, params, body }) => ({
    data: await executeCommandAs(
      actor,
      params.serverId,
      body.command,
      body.params,
    ),
  }),
);
