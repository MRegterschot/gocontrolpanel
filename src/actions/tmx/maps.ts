"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { downloadTMXMap, searchTMXMaps } from "@/lib/api/tmx";
import { getFileManager } from "@/lib/managers/file-manager";
import { TMXMapSearch } from "@/types/api/tmx";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import { uploadFiles } from "../filemanager";
import { addMap } from "../gbx/map";

export async function searchMaps(
  serverId: string,
  queryParams: Record<string, string>,
  after?: number,
): Promise<ServerResponse<TMXMapSearch>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      await logAudit(session.user.id, serverId, "server.tmx.map.search", {
        queryParams,
        after,
      });

      return searchTMXMaps(
        {
          ...queryParams,
          ...(after ? { after: after.toString() } : {}),
        },
        12,
      );
    },
  );
}

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
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.tmx.map.download",
          mapId,
          "File manager is not healthy",
        );
        throw new Error("File manager is not healthy");
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
        throw new Error("Failed to download map");
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
        throw new Error(error);
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
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.tmx.map.add",
          mapId,
          "File manager is not healthy",
        );
        throw new Error("File manager is not healthy");
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
        throw new Error(error);
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
        throw new Error(addMapError);
      }
    },
  );
}
