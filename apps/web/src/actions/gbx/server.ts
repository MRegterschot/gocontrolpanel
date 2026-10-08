"use server";

import { ServerSettingsSchemaType } from "@/forms/server/settings/settings-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { ServerResponse } from "@/types/responses";
import { saveServerSettingsAs } from "./server-only/server";

export async function saveServerSettings(
  serverId: string,
  serverSettings: ServerSettingsSchemaType,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) =>
      saveServerSettingsAs(actorFromSession(session), serverId, serverSettings),
  );
}
