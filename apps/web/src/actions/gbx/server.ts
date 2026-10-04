"use server";

import { ServerSettingsSchemaType } from "@/forms/server/settings/settings-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { getLogger } from "@/lib/logger";
import { getGbxClient, publishServerEvent } from "@/lib/gbx-service";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";

export async function saveServerSettings(
  serverId: string,
  serverSettings: ServerSettingsSchemaType,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const meta = {
        type: "gbx",
        module: "server",
        function: "saveServerSettings",
      };
      const log = getLogger(serverId);
      const client = getGbxClient(serverId);
      const db = getClient();

      if (serverSettings.enableHelpCommand !== undefined) {
        await db.servers.update({
          where: { id: serverId },
          data: { enableHelpCommand: serverSettings.enableHelpCommand },
        });

        await publishServerEvent({ type: "server.updated", serverId });
      }

      serverSettings.defaultOptions.NextCallVoteTimeOut *= 1000; // Convert to milliseconds
      if (serverSettings.defaultOptions.CallVoteRatio < 0) {
        serverSettings.defaultOptions.CallVoteRatio = -1;
      } else {
        serverSettings.defaultOptions.CallVoteRatio /= 100; // Convert to 0-1 range
      }
      serverSettings.defaultOptions.DisableHorns =
        !serverSettings.defaultOptions.DisableHorns;
      serverSettings.defaultOptions.DisableServiceAnnounces =
        !serverSettings.defaultOptions.DisableServiceAnnounces;

      const res = await client
        .multicall([
          ["SetServerOptions", serverSettings.defaultOptions],
          [
            "SetConnectionRates",
            serverSettings.downloadRate,
            serverSettings.uploadRate,
          ],
          ["DisableProfileSkins", !serverSettings.profileSkins],
          ["AllowMapDownload", serverSettings.allowMapDownload],
        ])
        .catch((error) => {
          log.error({ meta, error }, "Error saving server settings");
          throw new ServerError("Failed to save server settings", "SaveServerSettingsError");
        });

      let error: string | undefined = undefined;

      if (!res) {
        error = "Failed to save server settings";
      } else if (!res[0]) {
        error = "Failed to save server settings";
      } else if (!res[1]) {
        error = "Failed to save connection rates";
      } else if (!res[2]) {
        error = "Failed to save profile skins settings";
      } else if (!res[3]) {
        error = "Failed to save map download settings";
      }

      await logAudit(
        session.user.id,
        serverId,
        "server.settings.edit",
        serverSettings,
        error,
      );

      if (error) {
        throw new ServerError(error, "SaveServerSettingsError");
      }
    },
  );
}
