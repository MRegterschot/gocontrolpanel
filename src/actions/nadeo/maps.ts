"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { downloadFile } from "@/lib/api/nadeo";
import { getFileManager } from "@/lib/managers/file-manager";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import { uploadFiles } from "../filemanager";
import { addMap } from "../gbx/map";

export async function downloadMapFromUrl(
  serverId: string,
  url: string,
  fileName: string,
  path?: string,
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
          "server.nadeo.map.download",
          { url, fileName, path },
          "File manager is not healthy",
        );
        throw new Error("File manager is not healthy");
      }

      const file = await downloadFile(url, fileName);
      if (!file) {
        await logAudit(
          session.user.id,
          serverId,
          "server.nadeo.map.download",
          { url, fileName, path },
          "Failed to download map",
        );
        throw new Error("Failed to download map");
      }

      const formData = new FormData();
      formData.append("files", file);
      formData.append("paths[]", `/UserData/Maps/Downloaded/${path}`);

      const { error } = await uploadFiles(serverId, formData);

      await logAudit(
        session.user.id,
        serverId,
        "server.nadeo.map.download",
        { url, fileName, path },
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
  url: string,
  fileName: string,
  path?: string,
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
          "server.nadeo.map.add",
          { url, fileName, path },
          "File manager is not healthy",
        );
        throw new Error("File manager is not healthy");
      }

      const { data: file, error } = await downloadMapFromUrl(
        serverId,
        url,
        fileName,
        path,
      );
      if (error) {
        await logAudit(
          session.user.id,
          serverId,
          "server.nadeo.map.add",
          { url, fileName },
          error,
        );
        throw new Error(error);
      }

      const { error: addMapError } = await addMap(
        serverId,
        `Downloaded/${path ? path + "/" : ""}${file}`,
      );

      await logAudit(
        session.user.id,
        serverId,
        "server.nadeo.map.add",
        { url, fileName, path },
        addMapError,
      );

      if (addMapError) {
        throw new Error(addMapError);
      }
    },
  );
}
