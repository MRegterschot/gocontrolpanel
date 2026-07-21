"use server";

import { CreateFileEntrySchemaType } from "@/forms/server/files/create-file-entry-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { getLogger } from "@/lib/logger";
import { getFileManager } from "@/lib/managers/file-manager";
import { gameModesScripts } from "@/lib/scripts";
import { ContentType, File, FileEntry } from "@/types/filemanager";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";

export async function getRoute(
  serverId: string,
  path: string,
): Promise<ServerResponse<FileEntry[]>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const meta = {
        type: "filemanager",
        module: "filemanager",
        function: "getRoute",
      };
      const log = getLogger(serverId);
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        throw new ServerError("Could not connect to file manager");
      }

      const res = await fetch(fileManager.url + path, {
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
            path,
            response: {
              status: res.status,
              statusText: res.statusText,
              error: await res.text(),
            },
          },
          "Failed to get files",
        );
        throw new ServerError("Failed to get files");
      }

      let data: FileEntry[] | undefined;

      try {
        data = await res.json();
      } catch {
        log.warn({ meta, path }, "Route is a file");
        throw new ServerError("Route is a file");
      }

      if (!data) {
        log.error({ meta, path }, "Failed to get files, no data returned");
        throw new ServerError("Failed to get files");
      }

      const parsedData = data.map((entry: any) => ({
        ...entry,
        lastModified: new Date(entry.lastModified),
      }));

      return parsedData;
    },
  );
}

export async function getFile(
  serverId: string,
  path: string,
): Promise<ServerResponse<File>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const meta = {
        type: "filemanager",
        module: "filemanager",
        function: "getFile",
      };
      const log = getLogger(serverId);
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        throw new ServerError("Could not connect to file manager");
      }

      const res = await fetch(fileManager.url + path, {
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
            path,
            response: {
              status: res.status,
              statusText: res.statusText,
              error: await res.text(),
            },
          },
          "Failed to get file",
        );
        throw new ServerError("Failed to get files");
      }

      const contentType = res.headers.get("Content-Type");
      const fileType: ContentType = contentType
        ? (contentType.split("/")[0] as ContentType)
        : "text";

      const data =
        fileType === "image" || fileType === "video"
          ? await res.arrayBuffer()
          : await res.text();

      return {
        value: data,
        type: fileType,
      };
    },
  );
}

export async function saveFileText(
  serverId: string,
  path: string,
  text: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const meta = {
        type: "filemanager",
        module: "filemanager",
        function: "saveFileText",
      };
      const log = getLogger(serverId);
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.files.edit",
          { path, text },
          "File manager is not healthy",
        );
        throw new ServerError("Could not connect to file manager");
      }

      const res = await fetch(fileManager.url + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${fileManager.password}`,
        },
        body: JSON.stringify(text),
      });

      await logAudit(
        session.user.id,
        serverId,
        "server.files.edit",
        { path, text },
        res.status !== 200 ? "Failed to save file" : undefined,
      );

      if (res.status !== 200) {
        log.error(
          {
            meta,
            path,
            response: {
              status: res.status,
              statusText: res.statusText,
              error: await res.text(),
            },
          },
          "Failed to save file",
        );
        throw new ServerError("Failed to save file");
      }
    },
  );
}

export async function deleteEntry(
  serverId: string,
  paths: string[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.files.delete",
          paths,
          "File manager is not healthy",
        );
        throw new ServerError("Could not connect to file manager");
      }

      const res = await fetch(fileManager.url + "/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${fileManager.password}`,
        },
        body: JSON.stringify(paths),
      });

      await logAudit(
        session.user.id,
        serverId,
        "server.files.delete",
        paths,
        res.status !== 200 ? "Failed to delete item" : undefined,
      );

      if (res.status !== 200) {
        throw new ServerError("Failed to delete item");
      }
    },
  );
}

export async function uploadFiles(
  serverId: string,
  formData: FormData,
): Promise<ServerResponse<FileEntry[]>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const meta = {
        type: "filemanager",
        module: "filemanager",
        function: "uploadFiles",
      };
      const log = getLogger(serverId);
      const uploadAuditData = {
        files: formData
          .getAll("files")
          .map((file) =>
            file instanceof globalThis.File ? file.name : file.toString(),
          ),
        paths: formData.getAll("paths[]").map((path) => path.toString()),
      };

      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.files.upload",
          uploadAuditData,
          "Failed to upload files, file manager is not healthy",
        );
        throw new ServerError("Could not connect to file manager");
      }

      log.info(
        {
          meta,
          uploadAuditData,
        },
        "Uploading files to file manager",
      );

      const res = await fetch(fileManager.url + "/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fileManager.password}`,
        },
        body: formData,
      });

      if (res.status !== 200) {
        await logAudit(
          session.user.id,
          serverId,
          "server.files.upload",
          uploadAuditData,
          `Failed to upload files, status code: ${res.status}`,
        );
        throw new ServerError("Failed to upload files");
      }

      const data = await res.json();

      await logAudit(
        session.user.id,
        serverId,
        "server.files.upload",
        uploadAuditData,
        !data ? "Failed to upload files" : undefined,
      );

      if (!data) {
        throw new ServerError("Failed to upload files");
      }

      const parsedData = data.map((entry: any) => ({
        ...entry,
        lastModified: new Date(entry.lastModified),
      }));

      return parsedData;
    },
  );
}

export async function getScripts(
  serverId: string,
): Promise<ServerResponse<string[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const meta = {
        type: "filemanager",
        module: "filemanager",
        function: "getScripts",
      };
      const log = getLogger(serverId);

      try {
        const fileManager = await getFileManager(serverId);
        if (!fileManager?.health) {
          throw new ServerError("Could not connect to file manager");
        }

        const res = await fetch(`${fileManager.url}/scripts`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${fileManager.password}`,
          },
        });

        if (res.status !== 200) {
          throw new ServerError("Failed to get scripts");
        }

        const data: string[] = await res.json();
        if (!data) {
          throw new ServerError("Failed to get scripts");
        }

        const allScripts = [...data, ...gameModesScripts];
        return [...new Set(allScripts)];
      } catch (error) {
        log.error({ meta, error }, "Error getting scripts");
        return gameModesScripts;
      }
    },
  );
}

export async function getPluginScripts(
  serverId: string,
): Promise<ServerResponse<string[]>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const meta = {
        type: "filemanager",
        module: "filemanager",
        function: "getPluginScripts",
      };
      const log = getLogger(serverId);
      try {
        const fileManager = await getFileManager(serverId);
        if (!fileManager?.health) {
          throw new ServerError("Could not connect to file manager");
        }

        const res = await fetch(`${fileManager.url}/plugin-scripts`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${fileManager.password}`,
          },
        });

        if (res.status !== 200) {
          throw new ServerError("Failed to get scripts");
        }

        const data: string[] = await res.json();
        if (!data) {
          throw new ServerError("Failed to get scripts");
        }

        return [...new Set(data)];
      } catch (error) {
        log.error({ meta, error }, "Error getting scripts");
        return [];
      }
    },
  );
}

export async function getMatchSettings(
  serverId: string,
): Promise<ServerResponse<string[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `group:servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const meta = {
        type: "filemanager",
        module: "filemanager",
        function: "getMatchSettings",
      };
      const log = getLogger(serverId);
      try {
        const fileManager = await getFileManager(serverId);
        if (!fileManager?.health) {
          throw new ServerError("Could not connect to file manager");
        }

        const res = await fetch(`${fileManager.url}/match-settings`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${fileManager.password}`,
          },
        });

        if (res.status !== 200) {
          throw new ServerError("Failed to get match settings");
        }

        const data: string[] = await res.json();
        if (!data) {
          throw new ServerError("Failed to get match settings");
        }

        return [...new Set(data)];
      } catch (error) {
        log.error({ meta, error }, "Error getting match settings");
        return [];
      }
    },
  );
}

export async function createFileEntry(
  serverId: string,
  request: CreateFileEntrySchemaType,
): Promise<ServerResponse<FileEntry>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.files.create",
          request,
          "File manager is not healthy",
        );
        throw new ServerError("Could not connect to file manager");
      }

      const res = await fetch(fileManager.url + "/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${fileManager.password}`,
        },
        body: JSON.stringify(request),
      });

      if (res.status !== 200) {
        await logAudit(
          session.user.id,
          serverId,
          "server.files.create",
          request,
          res.status === 500 ? "Something went wrong" : await res.text(),
        );
        throw new ServerError(
          res.status === 500 ? "Something went wrong" : await res.text(),
        );
      }

      const data = await res.json();

      await logAudit(
        session.user.id,
        serverId,
        "server.files.create",
        request,
        !data ? "Failed to create file entry" : undefined,
      );

      if (!data) {
        throw new ServerError("Failed to create file entry");
      }

      return {
        ...data,
        lastModified: new Date(data.lastModified),
      };
    },
  );
}
