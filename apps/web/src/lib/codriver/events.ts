import { gbxService } from "@/lib/gbx-service";
import { getLogger } from "@/lib/logger";
import "server-only";
import type { ToolContext } from "./types";

// Tells the server's plugins what Codriver changed, as "codriver:action". Best effort: a game
// server that is offline or a slow service never fails the request.
export async function emitAction(
  ctx: ToolContext,
  tool: string,
  input: unknown,
): Promise<void> {
  await gbxService
    .emitPluginEvent(ctx.serverId, {
      source: "codriver",
      name: "action",
      payload: { tool, args: input, login: ctx.actor.login },
    })
    .catch((error) =>
      getLogger(ctx.serverId).warn(
        { error, tool },
        "Codriver action event failed",
      ),
    );
}
