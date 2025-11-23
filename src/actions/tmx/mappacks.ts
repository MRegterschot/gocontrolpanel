"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import {
  downloadTMXMap,
  searchTMXMappacks,
  searchTMXMaps,
} from "@/lib/api/tmx";
import { getFileManager } from "@/lib/managers/file-manager";
import { TMXMappackSearch } from "@/types/api/tmx";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import { uploadFiles } from "../filemanager";
import { addMap } from "../gbx/map";

export async function searchMappacks(
  serverId: string,
  queryParams: Record<string, string>,
  after?: number,
): Promise<ServerResponse<TMXMappackSearch>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      await logAudit(session.user.id, serverId, "server.tmx.mappack.search", {
        queryParams,
        after,
      });

      return searchTMXMappacks(
        {
          ...queryParams,
          ...(after ? { after: after.toString() } : {}),
        },
        12,
      );
    },
  );
}

export async function downloadMappack(
  serverId: string,
  mappackId: number,
  mappackName: string,
): Promise<ServerResponse<string[]>> {
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
          "server.tmx.mappack.download",
          { mappackId, mappackName },
          "File manager is not healthy",
        );
        throw new Error("File manager is not healthy");
      }

      const mappackSearch = await searchTMXMaps(
        { mappackid: mappackId.toString() },
        100,
      );

      if (mappackSearch.More) {
        await logAudit(
          session.user.id,
          serverId,
          "server.tmx.mappack.download",
          { mappackId, mappackName },
          "Cannot download mappack with more than 100 maps",
        );
        throw new Error("Cannot download mappack with more than 100 maps");
      }

      const downloadResults = await Promise.allSettled(
        mappackSearch.Results.map((map) =>
          downloadTMXMap(map.MapId, mappackId),
        ),
      );

      const formData = new FormData();
      let errors = 0;

      downloadResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const file = result.value;
          formData.append("files", file);
          formData.append(
            "paths[]",
            `/UserData/Maps/Downloaded/${mappackName}`,
          );
        } else {
          errors++;
          console.error(`Failed to download map ${index + 1}:`, result.reason);
        }
      });

      const { error } = await uploadFiles(serverId, formData);
      if (error) {
        await logAudit(
          session.user.id,
          serverId,
          "server.tmx.mappack.download",
          { mappackId, mappackName },
          error,
        );
        throw new Error(error);
      }

      await logAudit(
        session.user.id,
        serverId,
        "server.tmx.mappack.download",
        { mappackId, mappackName },
        errors > 0 ? `Failed to download ${errors} maps` : undefined,
      );

      if (errors > 0) {
        throw new Error(`Failed to download ${errors} maps`);
      }

      return downloadResults
        .map((result) =>
          result.status === "fulfilled" ? result.value.name : "",
        )
        .filter((r) => r !== "");
    },
  );
}

export async function addMappackToServer(
  serverId: string,
  mappackId: number,
  mappackName: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const { data: fileNames, error } = await downloadMappack(
        serverId,
        mappackId,
        mappackName,
      );
      if (error) {
        await logAudit(
          session.user.id,
          serverId,
          "server.tmx.mappack.add",
          { mappackId, mappackName },
          error,
        );
        throw new Error(error);
      }

      const addMapPromises = fileNames.map((fileName) =>
        addMap(serverId, `Downloaded/${mappackName}/${fileName}`),
      );

      const addMapResults = await Promise.allSettled(addMapPromises);

      let errors: number = 0;
      addMapResults.forEach((result, index) => {
        if (result.status === "rejected") {
          errors++;
          console.error(`Failed to add map ${index + 1}:`, result.reason);
        }
      });

      await logAudit(
        session.user.id,
        serverId,
        "server.tmx.mappack.add",
        { mappackId, mappackName },
        errors > 0 ? `Failed to add ${errors} maps` : undefined,
      );

      if (errors > 0) {
        throw new Error(`Failed to add ${errors} maps`);
      }
    },
  );
}
