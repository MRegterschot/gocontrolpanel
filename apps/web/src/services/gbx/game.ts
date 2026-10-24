import { doServerActionWithAuth } from "@/lib/actions";
import { type Actor, actorFromSession, requirePermission } from "@/lib/actor";
import { getGbxClient } from "@/lib/gbx-service";
import { ModeScriptInfo } from "@/types/gbx";
import { ServerResponse } from "@/types/responses";
import { serverPermissions } from "@gcp/shared";
import "server-only";

type CurrentAndNext<T> = { CurrentValue: T; NextValue: T };
type ScriptSettings = { [key: string]: string | number | boolean };

const MODERATOR = (serverId: string) => [
  `servers:${serverId}:moderator`,
  `servers:${serverId}:admin`,
  `group:servers:${serverId}:moderator`,
  `group:servers:${serverId}:admin`,
];

// Game reads for an actor; the panel and the public API both call these

export async function getShowOpponentsAs(
  actor: Actor,
  serverId: string,
): Promise<CurrentAndNext<number>> {
  requirePermission(actor, serverPermissions.moderator, serverId);
  return getGbxClient(serverId).call("GetForceShowAllOpponents");
}

export async function getScriptNameAs(
  actor: Actor,
  serverId: string,
): Promise<CurrentAndNext<string>> {
  requirePermission(actor, serverPermissions.moderator, serverId);
  return getGbxClient(serverId).call("GetScriptName");
}

export async function getModeScriptInfoAs(
  actor: Actor,
  serverId: string,
): Promise<ModeScriptInfo> {
  requirePermission(actor, serverPermissions.moderator, serverId);
  return getGbxClient(serverId).call("GetModeScriptInfo");
}

export async function getModeScriptSettingsAs(
  actor: Actor,
  serverId: string,
): Promise<ScriptSettings> {
  requirePermission(actor, serverPermissions.moderator, serverId);
  return getGbxClient(serverId).call("GetModeScriptSettings");
}

export async function getShowOpponents(
  serverId: string,
): Promise<ServerResponse<CurrentAndNext<number>>> {
  return doServerActionWithAuth(MODERATOR(serverId), (session) =>
    getShowOpponentsAs(actorFromSession(session), serverId),
  );
}

export async function getScriptName(
  serverId: string,
): Promise<ServerResponse<CurrentAndNext<string>>> {
  return doServerActionWithAuth(MODERATOR(serverId), (session) =>
    getScriptNameAs(actorFromSession(session), serverId),
  );
}

export async function getModeScriptInfo(
  serverId: string,
): Promise<ServerResponse<ModeScriptInfo>> {
  return doServerActionWithAuth(MODERATOR(serverId), (session) =>
    getModeScriptInfoAs(actorFromSession(session), serverId),
  );
}

export async function getModeScriptSettings(
  serverId: string,
): Promise<ServerResponse<ScriptSettings>> {
  return doServerActionWithAuth(MODERATOR(serverId), (session) =>
    getModeScriptSettingsAs(actorFromSession(session), serverId),
  );
}
