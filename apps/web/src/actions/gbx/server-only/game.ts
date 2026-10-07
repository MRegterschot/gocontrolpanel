import { type Actor, requirePermission } from "@/lib/actor";
import { gbxService, getGbxClient } from "@/lib/gbx-service";
import { getLogger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import { serverPermissions } from "@gcp/shared";
import "server-only";
import { logAudit } from "../../database/server-only/audit-logs";

// Game operations for an actor; the Server Actions and Codriver both call these

export async function restartMapAs(
  actor: Actor,
  serverId: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  await client.call("RestartMap");
  await logAudit(actor.userId, serverId, "server.game.map.restart");
}

export async function nextMapAs(actor: Actor, serverId: string): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  await client.call("NextMap");
  await logAudit(actor.userId, serverId, "server.game.map.next");
}

export async function setScriptNameAs(
  actor: Actor,
  serverId: string,
  script: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  await gbxService.setScriptName(serverId, script);
  await logAudit(actor.userId, serverId, "server.game.script.edit", script);
}

export async function setModeScriptSettingsAs(
  actor: Actor,
  serverId: string,
  settings: { [key: string]: string | number | boolean },
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  await gbxService.setScriptSettings(serverId, settings);
  await logAudit(
    actor.userId,
    serverId,
    "server.game.scriptsettings.edit",
    settings,
  );
}

export async function pauseMatchAs(
  actor: Actor,
  serverId: string,
  paused: boolean,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const meta = {
    type: "gbx",
    module: "game",
    function: "pauseMatch",
  };
  const log = getLogger(serverId);
  let error: string | undefined;
  try {
    await gbxService.setPaused(serverId, paused);
  } catch (e) {
    error = getErrorMessage(e);
  }

  await logAudit(actor.userId, serverId, "server.live.pause", paused, error);

  if (error) {
    log.error({ meta, error, pause: paused }, "Failed to pause match");
    throw new ServerError(error, "PauseMatchError");
  }
}
