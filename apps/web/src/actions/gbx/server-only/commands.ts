import { requirePermission, type Actor } from "@/lib/actor";
import { gbxService } from "@/lib/gbx-service";
import {
  commandBodySchema,
  serverPermissions,
  type CommandResult,
} from "@tmcontrolpanel/shared";
import "server-only";
import { logAudit } from "../../database/server-only/audit-logs";

export async function executeCommandAs(
  actor: Actor,
  serverId: string,
  command: string,
  params: string[],
): Promise<CommandResult> {
  requirePermission(actor, serverPermissions.admin, serverId);
  const body = commandBodySchema.parse({ command, params, login: actor.login });
  const result = await gbxService.executeCommand(serverId, body);
  // Arguments may contain plugin secrets; record only the name and outcome.
  await logAudit(actor.userId, serverId, "server.commands.execute", {
    command: body.command,
    handled: result.handled,
  });
  return result;
}
