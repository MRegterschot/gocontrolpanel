"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClient } from "@/lib/managers/gbxclient-manager";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";

export async function getServerPlugin(
  serverId: string,
): Promise<ServerResponse<unknown>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const client = await getGbxClient(serverId);
      return await client.call("GetServerPlugin");
    },
  );
}

export async function setServerPlugin(
  serverId: string,
  forceReload: boolean,
  name: string,
  settings: {
    [key: string]: string | number | boolean;
  },
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("SetServerPlugin", forceReload, name, settings);
      await logAudit(
        session.user.id,
        serverId,
        "server.plugin.serverPlugin.set",
        { name, settings, forceReload },
      );
    },
  );
}

export async function getServerPluginVariables(
  serverId: string,
): Promise<ServerResponse<Record<string, string | number | boolean>>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const client = await getGbxClient(serverId);
      return await client.call("GetServerPluginVariables");
    },
  );
}

export async function setServerPluginVariables(
  serverId: string,
  variables: Record<string, string | number | boolean>,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("SetServerPluginVariables", variables);
      await logAudit(
        session.user.id,
        serverId,
        "server.plugin.serverPlugin.setVariables",
        { variables },
      );
    },
  );
}

export async function triggerServerPluginEvent(
  serverId: string,
  eventName: string,
  param: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("TriggerServerPluginEvent", eventName, param);
      await logAudit(
        session.user.id,
        serverId,
        "server.plugin.serverPlugin.triggerEvent",
        { eventName, param },
      );
    },
  );
}

export async function triggerServerPluginEventArray(
  serverId: string,
  eventName: string,
  params: string[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("TriggerServerPluginEventArray", eventName, params);
      await logAudit(
        session.user.id,
        serverId,
        "server.plugin.serverPlugin.triggerEventArray",
        { eventName, params },
      );
    },
  );
}
