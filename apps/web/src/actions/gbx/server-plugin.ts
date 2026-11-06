"use server";
import { assertResourceId } from "@/lib/resource-id";

import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { getGbxClient } from "@/lib/gbx-service";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import {
  setServerPluginAs,
  setServerPluginVariablesAs,
  triggerServerPluginEventAs,
} from "./server-only/server-plugin";

export async function setServerPlugin(
  serverId: string,
  forceReload: boolean,
  name: string,
  settings: Record<string, string | number | boolean>,
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) =>
      setServerPluginAs(
        actorFromSession(session),
        serverId,
        forceReload,
        name,
        settings,
      ),
  );
}

export async function setServerPluginVariables(
  serverId: string,
  variables: Record<string, string | number | boolean>,
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) =>
      setServerPluginVariablesAs(
        actorFromSession(session),
        serverId,
        variables,
      ),
  );
}

export async function triggerServerPluginEvent(
  serverId: string,
  eventName: string,
  param: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const client = getGbxClient(serverId);
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
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) =>
      triggerServerPluginEventAs(
        actorFromSession(session),
        serverId,
        eventName,
        params,
      ),
  );
}
