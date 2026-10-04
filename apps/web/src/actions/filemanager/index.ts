"use server";

import { CreateFileEntrySchemaType } from "@/forms/server/files/create-file-entry-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { getLogger } from "@/lib/logger";
import { getFileManager } from "@/lib/managers/file-manager";
import { FileEntry } from "@/types/filemanager";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";

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
        throw new ServerError("Could not connect to file manager", "FileManagerNotHealthy");
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
        throw new ServerError("Failed to save file", "FileSaveError");
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
        throw new ServerError("Could not connect to file manager", "FileManagerNotHealthy");
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
        throw new ServerError("Failed to delete item", "FileDeleteError");
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
        throw new ServerError("Could not connect to file manager", "FileManagerNotHealthy");
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
        throw new ServerError("Failed to upload files", "FileUploadError");
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
        throw new ServerError("Failed to upload files", "FileUploadError");
      }

      const parsedData = data.map((entry: any) => ({
        ...entry,
        lastModified: new Date(entry.lastModified),
      }));

      return parsedData;
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
        throw new ServerError("Could not connect to file manager", "FileManagerNotHealthy");
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
          "FileCreateError",
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
        throw new ServerError("Failed to create file entry", "FileCreateError");
      }

      return {
        ...data,
        lastModified: new Date(data.lastModified),
      };
    },
  );
}
