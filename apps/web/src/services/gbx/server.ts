import { ServerSettingsSchemaType } from "@/forms/server/settings/settings-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { callEach } from "@/lib/gbx-batch";
import { getGbxClient } from "@/lib/gbx-service";
import { getLogger } from "@/lib/logger";
import { getFileManager } from "@/lib/managers/file-manager";
import { LocalMapInfo } from "@/types/map";
import { ServerError, ServerResponse } from "@/types/responses";
import { type SMapInfo } from "@tmcp/shared";
import path from "path";
import "server-only";

export async function getServerSettings(
  serverId: string,
): Promise<ServerResponse<ServerSettingsSchemaType>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const meta = {
        type: "gbx",
        module: "server",
        function: "getServerSettings",
      };
      const log = getLogger(serverId);
      const client = getGbxClient(serverId);
      const [server, settings] = await Promise.all([
        getClient().servers.findUnique({
          where: { id: serverId },
          select: { enableHelpCommand: true },
        }),
        client.multicall([
          ["GetServerOptions"],
          ["GetHideServer"],
          ["IsKeepingPlayerSlots"],
          ["AreHornsDisabled"],
          ["AreServiceAnnouncesDisabled"],
          ["GetSystemInfo"],
          ["AreProfileSkinsDisabled"],
          ["IsMapDownloadAllowed"],
        ]),
      ]);

      if (!settings) {
        log.error({ meta }, "Failed to get server settings");
        throw new ServerError(
          "Failed to get server settings",
          "GetServerSettingsError",
        );
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
          enableHelpCommand: server?.enableHelpCommand ?? false,
        };

        return serverSettings;
      } catch (error) {
        log.error({ meta, error }, "Error parsing server settings");
        throw new ServerError(
          "Failed to parse server settings",
          "ParseServerSettingsError",
        );
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
      const meta = {
        type: "gbx",
        module: "map",
        function: "getLocalMaps",
      };
      const log = getLogger(serverId);
      const client = getGbxClient(serverId);

      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        throw new ServerError(
          "Could not connect to file manager",
          "FileManagerNotHealthy",
        );
      }

      const res = await fetch(`${fileManager.url}/maps`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${fileManager.password}`,
        },
      });

      if (res.status !== 200) {
        log.error(
          {
            meta,
            response: {
              status: res.status,
              statusText: res.statusText,
              body: await res.text(),
            },
          },
          "Failed to get maps from file manager",
        );
        throw new ServerError("Failed to get maps", "GetLocalMapsError");
      }

      const maps = await res.json();
      if (!maps) {
        log.error(
          { meta },
          "Failed to get maps from file manager: No maps returned",
        );
        throw new ServerError("Failed to get maps", "GetLocalMapsError");
      }

      const infos = await callEach<SMapInfo>(
        client,
        "GetMapInfo",
        maps.map((map: string) => [map]),
      );
      const mapInfoList: LocalMapInfo[] = [];

      infos.forEach((mapInfo, i) => {
        if (!mapInfo) {
          log.error({ meta, map: maps[i] }, "Error getting map info");
          return;
        }
        mapInfoList.push({
          ...mapInfo,
          Path: path.dirname(maps[i]),
        } as LocalMapInfo);
      });

      return mapInfoList;
    },
  );
}
