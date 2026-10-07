import { type Actor, requirePermission } from "@/lib/actor";
import { getLogger } from "@/lib/logger";
import { getFileManager } from "@/lib/managers/file-manager";
import { FileEntry } from "@/types/filemanager";
import { ServerError } from "@/types/responses";
import { serverPermissions } from "@gcp/shared";
import "server-only";
import { logAudit } from "../../database/server-only/audit-logs";

export async function uploadFilesAs(
  actor: Actor,
  serverId: string,
  formData: FormData,
): Promise<FileEntry[]> {
  requirePermission(actor, serverPermissions.admin, serverId);

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
      actor.userId,
      serverId,
      "server.files.upload",
      uploadAuditData,
      "Failed to upload files, file manager is not healthy",
    );
    throw new ServerError(
      "Could not connect to file manager",
      "FileManagerNotHealthy",
    );
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
      actor.userId,
      serverId,
      "server.files.upload",
      uploadAuditData,
      `Failed to upload files, status code: ${res.status}`,
    );
    throw new ServerError("Failed to upload files", "FileUploadError");
  }

  const data = await res.json();

  await logAudit(
    actor.userId,
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
}
