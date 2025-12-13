"use server";

import { ServerSettingsSchemaType } from "@/forms/server/settings/settings-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { getFileManager } from "@/lib/managers/file-manager";
import { getGbxClient } from "@/lib/managers/gbxclient-manager";
import { LocalMapInfo } from "@/types/map";
import { ServerError, ServerResponse } from "@/types/responses";
import path from "path";
import { logAudit } from "../database/server-only/audit-logs";

export async function getServerSettings(
  serverId: string,
): Promise<ServerResponse<ServerSettingsSchemaType>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const client = await getGbxClient(serverId);
      const settings = await client.multicall([
        ["GetServerOptions"],
        ["GetHideServer"],
        ["IsKeepingPlayerSlots"],
        ["AreHornsDisabled"],
        ["AreServiceAnnouncesDisabled"],
        ["GetSystemInfo"],
        ["AreProfileSkinsDisabled"],
        ["IsMapDownloadAllowed"],
      ]);

      if (!settings) {
        throw new ServerError("Failed to get server settings");
      }

      try {
        const serverOptions = settings[0];
        const serverVisibility = settings[1];
        const keepPlayerSlots = settings[2];
        const hornsDisabled = settings[3];
        const serviceAnnouncesDisabled = settings[4];
        const systemInfo = settings[5];
        const profileSkinsDisabled = settings[6];
        const mapDownloadAllowed = settings[7];

        const serverSettings: ServerSettingsSchemaType = {
          defaultOptions: {
            Name: serverOptions.Name,
            Comment: serverOptions.Comment,
            Password: serverOptions.Password,
            PasswordForSpectator: serverOptions.PasswordForSpectator,
            NextCallVoteTimeOut: serverOptions.CurrentCallVoteTimeOut / 1000,
            CallVoteRatio:
              serverOptions.CallVoteRatio < 0
                ? -1
                : serverOptions.CallVoteRatio * 100,
            HideServer: serverVisibility,
            NextMaxPlayers: serverOptions.NextMaxPlayers,
            NextMaxSpectators: serverOptions.NextMaxSpectators,
            KeepPlayerSlots: keepPlayerSlots,
            AutoSaveReplays: serverOptions.AutoSaveReplays,
            DisableHorns: !hornsDisabled,
            DisableServiceAnnounces: !serviceAnnouncesDisabled,
          },
          allowMapDownload: mapDownloadAllowed,
          downloadRate: systemInfo.ConnectionDownloadRate,
          uploadRate: systemInfo.ConnectionUploadRate,
          profileSkins: !profileSkinsDisabled,
        };

        return serverSettings;
      } catch (error) {
        console.error("Error parsing server settings:", error);
        throw new ServerError("Failed to parse server settings");
      }
    },
  );
}

export async function saveServerSettings(
  serverId: string,
  serverSettings: ServerSettingsSchemaType,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const client = await getGbxClient(serverId);

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
          console.error("Error saving server settings:", error);
          throw new ServerError("Failed to save server settings");
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
        throw new ServerError(error);
      }
    },
  );
}

export async function getLocalMaps(
  serverId: string,
): Promise<ServerResponse<LocalMapInfo[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);

      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        throw new ServerError("Could not connect to file manager");
      }

      const res = await fetch(`${fileManager.url}/maps`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${fileManager.password}`,
        },
      });

      if (res.status !== 200) {
        throw new ServerError("Failed to get maps");
      }

      const maps = await res.json();
      if (!maps) {
        throw new ServerError("Failed to get maps");
      }

      const mapInfoList: LocalMapInfo[] = [];

      for (const map of maps) {
        try {
          const mapInfo = await client.call("GetMapInfo", map);

          if (!mapInfo) {
            throw new ServerError(`Failed to get map info for ${map}`);
          }

          mapInfoList.push({
            ...mapInfo,
            Path: path.dirname(map),
          } as LocalMapInfo);
        } catch (error) {
          console.error(`Error getting map info for ${map}:`, error);
        }
      }

      return mapInfoList;
    },
  );
}
