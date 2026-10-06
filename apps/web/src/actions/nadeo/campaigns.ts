"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { downloadFile } from "@/lib/api/nadeo";
import { getLogger } from "@/lib/logger";
import { getFileManager } from "@/lib/managers/file-manager";
import { CampaignWithNamesAndPlaylistMaps, ClubCampaignWithNamesAndPlaylistMaps } from "@/types/api/nadeo";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import { uploadFiles } from "../filemanager";
import { addMapToServer } from "./maps";

export async function downloadCampaign(
  serverId: string,
  campaign:
    | CampaignWithNamesAndPlaylistMaps
    | ClubCampaignWithNamesAndPlaylistMaps["campaign"],
): Promise<ServerResponse<string[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const meta = {
        type: "nadeo",
        module: "campaigns",
        function: "downloadCampaign",
      };
      const log = getLogger(serverId);
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.nadeo.campaign.download",
          JSON.parse(JSON.stringify(campaign)),
          "Failed to download campaign, file manager is not healthy",
        );
        throw new ServerError("File manager is not healthy", "FileManagerNotHealthy");
      }

      const downloadResults = await Promise.allSettled(
        campaign.playlist.map((p) => {
          if (!p.map?.fileUrl) {
            return Promise.reject(
              new Error(`Map ${p.mapUid} does not have a valid download URL`),
            );
          }
          return downloadFile(p.map.fileUrl, p.map.fileName);
        }),
      );

      const formData = new FormData();
      let errors = 0;

      downloadResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const file = result.value;
          formData.append("files", file);
          formData.append(
            "paths[]",
            `/UserData/Maps/Downloaded/${campaign.name}`,
          );
        } else {
          errors++;
          log.error({ meta, error: result, index }, "Failed to download map");
        }
      });

      const { error } = await uploadFiles(serverId, formData);
      if (error) {
        await logAudit(
          session.user.id,
          serverId,
          "server.nadeo.campaign.download",
          JSON.parse(JSON.stringify(campaign)),
          error,
        );
        throw new ServerError(error, "UploadFilesError");
      }

      await logAudit(
        session.user.id,
        serverId,
        "server.nadeo.campaign.download",
        JSON.parse(JSON.stringify(campaign)),
        errors > 0 ? `Failed to download ${errors} maps` : undefined,
      );

      if (errors > 0) {
        log.error({ meta, errors }, "Failed to download some maps");
        throw new ServerError(`Failed to download ${errors} maps`, "DownloadMapsError");
      }

      return downloadResults
        .map((result) =>
          result.status === "fulfilled" ? result.value.name : "",
        )
        .filter((name) => name !== "");
    },
  );
}

export async function addCampaignToServer(
  serverId: string,
  campaign:
    | CampaignWithNamesAndPlaylistMaps
    | ClubCampaignWithNamesAndPlaylistMaps["campaign"],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const meta = {
        type: "nadeo",
        module: "campaigns",
        function: "addCampaignToServer",
      };
      const log = getLogger(serverId);
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.nadeo.campaign.add",
          JSON.parse(JSON.stringify(campaign)),
          "Failed to add campaign, file manager is not healthy",
        );
        throw new ServerError("File manager is not healthy", "FileManagerNotHealthy");
      }

      const addResults = await Promise.allSettled(
        campaign.playlist.map((p) => {
          if (!p.map?.fileUrl) {
            return Promise.reject(
              new Error(`Map ${p.mapUid} does not have a valid download URL`),
            );
          }
          return addMapToServer(
            serverId,
            p.map.fileUrl,
            p.map.fileName,
            campaign.name,
          );
        }),
      );

      let errors = 0;
      addResults.forEach((result, index) => {
        if (result.status === "rejected") {
          errors++;
          log.error({ meta, error: result, index }, "Failed to add map");
        }
      });

      await logAudit(
        session.user.id,
        serverId,
        "server.nadeo.campaign.add",
        JSON.parse(JSON.stringify(campaign)),
        errors > 0 ? `Failed to add ${errors} maps` : undefined,
      );

      if (errors > 0) {
        log.error({ meta, errors }, "Failed to add some maps");
        throw new ServerError(`Failed to add ${errors} maps`, "AddMapsToServerError");
      }
    },
  );
}
