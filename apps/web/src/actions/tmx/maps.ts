"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { downloadTMXMap } from "@/lib/api/tmx";
import { getLogger } from "@/lib/logger";
import { getFileManager } from "@/lib/managers/file-manager";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import { uploadFiles } from "../filemanager";
import { addMap } from "../gbx/map";

export async function downloadMap(
  serverId: string,
  mapId: number,
): Promise<ServerResponse<string>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const meta = {
        type: "tmx",
        module: "maps",
        function: "downloadMap",
      };
      const log = getLogger(serverId);
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.tmx.map.download",
          mapId,
          "File manager is not healthy",
        );
        throw new ServerError("File manager is not healthy", "FileManagerNotHealthy");
      }

      const file = await downloadTMXMap(mapId);
      if (!file) {
        await logAudit(
          session.user.id,
          serverId,
          "server.tmx.map.download",
          mapId,
          "Failed to download map",
        );
        throw new ServerError("Failed to download map", "DownloadMapError");
      }

      const formData = new FormData();
      formData.append("files", file);
      formData.append("paths[]", `/UserData/Maps/Downloaded`);

      const { error } = await uploadFiles(serverId, formData);

      await logAudit(
        session.user.id,
        serverId,
        "server.tmx.map.download",
        mapId,
        error,
      );

      if (error) {
        log.error({ meta, error, mapId }, "Failed to upload map");
        throw new ServerError(error, "UploadFilesError");
      }

      return file.name;
    },
  );
}

export async function addMapToServer(
  serverId: string,
  mapId: number,
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
        type: "tmx",
        module: "maps",
        function: "addMapToServer",
      };
      const log = getLogger(serverId);
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.tmx.map.add",
          mapId,
          "File manager is not healthy",
        );
        throw new ServerError("File manager is not healthy", "FileManagerNotHealthy");
      }

      const { data: fileName, error } = await downloadMap(serverId, mapId);

      if (error) {
        await logAudit(
          session.user.id,
          serverId,
          "server.tmx.map.add",
          mapId,
          error,
        );
        throw new ServerError(error, "DownloadMapError");
      }

      const { error: addMapError } = await addMap(
        serverId,
        `Downloaded/${fileName}`,
      );

      await logAudit(
        session.user.id,
        serverId,
        "server.tmx.map.add",
        mapId,
        addMapError,
      );

      if (addMapError) {
        log.error({ meta, addMapError, mapId }, "Failed to add map");
        throw new ServerError(addMapError, "AddMapError");
      }
    },
  );
}
