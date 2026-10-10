"use server";

import { CreateFileEntrySchemaType } from "@/forms/server/files/create-file-entry-schema";
import {
  MoveFileEntriesSchema,
  MoveFileEntriesSchemaType,
} from "@/forms/server/files/move-file-entries-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { getLogger } from "@/lib/logger";
import { getFileManager } from "@/lib/managers/file-manager";
import { FileEntry } from "@/types/filemanager";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import { uploadFilesAs } from "./server-only/files";

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
        throw new ServerError(
          "Could not connect to file manager",
          "FileManagerNotHealthy",
        );
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
        throw new ServerError(
          "Could not connect to file manager",
          "FileManagerNotHealthy",
        );
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
    (session) => uploadFilesAs(actorFromSession(session), serverId, formData),
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
        throw new ServerError(
          "Could not connect to file manager",
          "FileManagerNotHealthy",
        );
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

export async function moveFileEntries(
  serverId: string,
  request: MoveFileEntriesSchemaType,
): Promise<ServerResponse<FileEntry[]>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async (session) => {
      const parsed = MoveFileEntriesSchema.safeParse(request);
      if (!parsed.success) {
        throw new ServerError("Invalid move request", "FileMoveError");
      }

      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.files.move",
          parsed.data,
          "File manager is not healthy",
        );
        throw new ServerError(
          "Could not connect to file manager",
          "FileManagerNotHealthy",
        );
      }

      const res = await fetch(fileManager.url + "/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${fileManager.password}`,
        },
        body: JSON.stringify(parsed.data),
      });

      if (res.status !== 200) {
        const message =
          res.status === 500 ? "Something went wrong" : await res.text();
        await logAudit(
          session.user.id,
          serverId,
          "server.files.move",
          parsed.data,
          message,
        );
        throw new ServerError(message, "FileMoveError");
      }

      const data = await res.json();

      await logAudit(
        session.user.id,
        serverId,
        "server.files.move",
        parsed.data,
      );

      return data.map(
        (
          entry: Omit<FileEntry, "lastModified"> & { lastModified: string },
        ) => ({
          ...entry,
          lastModified: new Date(entry.lastModified),
        }),
      );
    },
  );
}
