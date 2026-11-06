"use server";
import { fileManagerFetch } from "@/lib/managers/file-manager";
import { assertResourceId } from "@/lib/resource-id";

import { CreateFileEntrySchemaType } from "@/forms/server/files/create-file-entry-schema";
import { MoveFileEntriesSchemaType } from "@/forms/server/files/move-file-entries-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { fileAuditDetails } from "@/lib/audit-redact";
import { getLogger } from "@/lib/logger";
import { fileManagerUrl, getFileManager } from "@/lib/managers/file-manager";
import { FileEntry } from "@/types/filemanager";
import { ServerError, ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import {
  createEntryAs,
  deleteEntriesAs,
  moveEntriesAs,
  uploadFilesAs,
} from "./server-only/files";

export async function saveFileText(
  serverId: string,
  path: string,
  text: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
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
          fileAuditDetails(path, text),
          "File manager is not healthy",
        );
        throw new ServerError(
          "Could not connect to file manager",
          "FileManagerNotHealthy",
        );
      }

      const res = await fileManagerFetch(
        fileManagerUrl(fileManager.url!, path),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${fileManager.password}`,
          },
          body: JSON.stringify(text),
        },
      );

      await logAudit(
        session.user.id,
        serverId,
        "server.files.edit",
        fileAuditDetails(path, text),
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
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) => deleteEntriesAs(actorFromSession(session), serverId, paths),
  );
}

export async function uploadFiles(
  serverId: string,
  formData: FormData,
): Promise<ServerResponse<FileEntry[]>> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) => uploadFilesAs(actorFromSession(session), serverId, formData),
  );
}

export async function createFileEntry(
  serverId: string,
  request: CreateFileEntrySchemaType,
): Promise<ServerResponse<FileEntry>> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) => createEntryAs(actorFromSession(session), serverId, request),
  );
}

export async function moveFileEntries(
  serverId: string,
  request: MoveFileEntriesSchemaType,
): Promise<ServerResponse<FileEntry[]>> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    (session) => moveEntriesAs(actorFromSession(session), serverId, request),
  );
}
