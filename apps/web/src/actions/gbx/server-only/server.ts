import { ServerSettingsSchemaType } from "@/forms/server/settings/settings-schema";
import { type Actor, requirePermission } from "@/lib/actor";
import { getClient } from "@/lib/dbclient";
import { getGbxClient, publishServerEvent } from "@/lib/gbx-service";
import { getLogger } from "@/lib/logger";
import { ServerError } from "@/types/responses";
import { serverPermissions } from "@gcp/shared";
import "server-only";
import { logAudit } from "../../database/server-only/audit-logs";

// Server settings for an actor; the Server Action and Codriver both call this

export async function saveServerSettingsAs(
  actor: Actor,
  serverId: string,
  serverSettings: ServerSettingsSchemaType,
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

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
      throw new ServerError(
        "Failed to save server settings",
        "SaveServerSettingsError",
      );
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
    actor.userId,
    serverId,
    "server.settings.edit",
    serverSettings,
    error,
  );

  if (error) {
    throw new ServerError(error, "SaveServerSettingsError");
  }
}

export interface ServerOptionChanges {
  Name?: string;
  Comment?: string;
  NextMaxPlayers?: number;
  NextMaxSpectators?: number;
}

// Changes a few server options and keeps the rest, passwords included, as they are
export async function updateServerOptionsAs(
  actor: Actor,
  serverId: string,
  changes: ServerOptionChanges,
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const client = getGbxClient(serverId);
  const [
    options,
    hideServer,
    keepPlayerSlots,
    hornsDisabled,
    announcesDisabled,
  ] = await client.multicall([
    ["GetServerOptions"],
    ["GetHideServer"],
    ["IsKeepingPlayerSlots"],
    ["AreHornsDisabled"],
    ["AreServiceAnnouncesDisabled"],
  ]);

  const saved = await client.call("SetServerOptions", {
    Name: options.Name,
    Comment: options.Comment,
    Password: options.Password,
    PasswordForSpectator: options.PasswordForSpectator,
    NextCallVoteTimeOut: options.CurrentCallVoteTimeOut,
    CallVoteRatio: options.CallVoteRatio,
    HideServer: hideServer,
    NextMaxPlayers: options.NextMaxPlayers,
    NextMaxSpectators: options.NextMaxSpectators,
    KeepPlayerSlots: keepPlayerSlots,
    AutoSaveReplays: options.AutoSaveReplays,
    DisableHorns: hornsDisabled,
    DisableServiceAnnounces: announcesDisabled,
    ...changes,
  });

  if (!saved)
    throw new ServerError(
      "Failed to save server settings",
      "SaveServerSettingsError",
    );

  await logAudit(actor.userId, serverId, "server.settings.edit", {
    ...changes,
  });
}
