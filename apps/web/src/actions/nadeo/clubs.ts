"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { downloadFile } from "@/lib/api/nadeo";
import { getLogger } from "@/lib/logger";
import { getFileManager } from "@/lib/managers/file-manager";
import { ClubRoomWithNamesAndMaps, RoomWithMaps } from "@/types/api/nadeo";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import { uploadFiles } from "../filemanager";
import { addMapToServer } from "./maps";

export async function downloadRoom(
  serverId: string,
  room: RoomWithMaps | ClubRoomWithNamesAndMaps["room"],
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
        module: "clubs",
        function: "downloadRoom",
      };
      const log = getLogger(serverId);
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.nadeo.room.download",
          JSON.parse(JSON.stringify(room)),
          "File manager is not healthy",
        );
        throw new ServerError("File manager is not healthy", "FileManagerNotHealthy");
      }

      const downloadResults = await Promise.allSettled(
        room.mapObjects.map((map) => {
          if (!map?.fileUrl) {
            return Promise.reject(
              new Error(`Map ${map.uid} does not have a valid download URL`),
            );
          }
          return downloadFile(map.fileUrl, map.fileName);
        }),
      );

      const formData = new FormData();
      let errors = 0;

      downloadResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const file = result.value;
          formData.append("files", file);
          formData.append("paths[]", `/UserData/Maps/Downloaded/${room.name}`);
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
          "server.nadeo.room.download",
          JSON.parse(JSON.stringify(room)),
          error,
        );
        throw new ServerError(error, "UploadFilesError");
      }

      await logAudit(
        session.user.id,
        serverId,
        "server.nadeo.room.download",
        JSON.parse(JSON.stringify(room)),
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

export async function addRoomToServer(
  serverId: string,
  room: RoomWithMaps | ClubRoomWithNamesAndMaps["room"],
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
        module: "clubs",
        function: "addRoomToServer",
      };
      const log = getLogger(serverId);
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.nadeo.room.add",
          JSON.parse(JSON.stringify(room)),
          "File manager is not healthy",
        );
        throw new ServerError("File manager is not healthy", "FileManagerNotHealthy");
      }

      const addResults = await Promise.allSettled(
        room.mapObjects.map((map) => {
          if (!map?.fileUrl) {
            return Promise.reject(
              new ServerError(`Map ${map.uid} does not have a valid download URL`, "MapFileUrlMissing"),
            );
          }
          return addMapToServer(serverId, map.fileUrl, map.fileName);
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
        "server.nadeo.room.add",
        JSON.parse(JSON.stringify(room)),
        errors > 0 ? `Failed to add ${errors} maps` : undefined,
      );

      if (errors > 0) {
        log.error({ meta, errors }, "Failed to add some maps");
        throw new ServerError(`Failed to add ${errors} maps`, "AddMapsToServerError");
      }
    },
  );
}
