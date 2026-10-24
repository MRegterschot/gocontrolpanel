import { type Actor, requirePermission } from "@/lib/actor";
import { getGbxClient } from "@/lib/gbx-service";
import { ServerPlugin } from "@/types/gbx/server-plugin";
import { serverPermissions } from "@gcp/shared";
import "server-only";
import { logAudit } from "../../database/server-only/audit-logs";

// The dedicated server's own script plugin, not the panel's plugins; admins only

type Values = Record<string, string | number | boolean>;

export async function getServerPluginAs(
  actor: Actor,
  serverId: string,
): Promise<ServerPlugin> {
  requirePermission(actor, serverPermissions.admin, serverId);
  return getGbxClient(serverId).call("GetServerPlugin");
}

export async function setServerPluginAs(
  actor: Actor,
  serverId: string,
  forceReload: boolean,
  name: string,
  settings: Values,
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const client = getGbxClient(serverId);
  await client.call("SetServerPlugin", forceReload, name, settings);
  await logAudit(actor.userId, serverId, "server.plugin.serverPlugin.set", {
    name,
    settings,
    forceReload,
  });
}

export async function setServerPluginVariablesAs(
  actor: Actor,
  serverId: string,
  variables: Values,
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const client = getGbxClient(serverId);
  await client.call("SetServerPluginVariables", variables);
  await logAudit(
    actor.userId,
    serverId,
    "server.plugin.serverPlugin.setVariables",
    { variables },
  );
}

export async function triggerServerPluginEventAs(
  actor: Actor,
  serverId: string,
  eventName: string,
  params: string[],
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const client = getGbxClient(serverId);
  await client.call("TriggerServerPluginEventArray", eventName, params);
  await logAudit(
    actor.userId,
    serverId,
    "server.plugin.serverPlugin.triggerEventArray",
    { eventName, params },
  );
}
