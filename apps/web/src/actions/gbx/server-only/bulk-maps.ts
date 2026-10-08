import { uploadFilesAs } from "@/actions/filemanager/server-only/files";
import { type Actor, requirePermission } from "@/lib/actor";
import { getLogger } from "@/lib/logger";
import { getFileManager } from "@/lib/managers/file-manager";
import { getErrorMessage } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import type { Prisma } from "@gcp/db";
import { serverPermissions } from "@gcp/shared";
import "server-only";
import { logAudit } from "../../database/server-only/audit-logs";
import { addMapAs } from "./map";

// Folder names come from campaign and pack titles, so keep them path-safe
export function safeFolderName(name: string): string {
  const clean = name
    .replace(/[^\w .()-]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return clean || "Maps";
}

// Uploads map files into Downloaded/<folder> and adds them to the server's map list.
// Returns the added paths (relative to the maps folder) and the names of files that failed.
export async function addMapFilesAs(
  actor: Actor,
  serverId: string,
  files: File[],
  folder: string,
  auditAction: string,
  details: Prisma.InputJsonValue,
): Promise<{ paths: string[]; failed: string[] }> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const log = getLogger(serverId);
  const dir = safeFolderName(folder);
  const fileManager = await getFileManager(serverId);
  if (!fileManager?.health) {
    await logAudit(
      actor.userId,
      serverId,
      auditAction,
      details,
      "File manager is not healthy",
    );
    throw new ServerError(
      "File manager is not healthy",
      "FileManagerNotHealthy",
    );
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
    formData.append("paths[]", `/UserData/Maps/Downloaded/${dir}`);
  }
  try {
    await uploadFilesAs(actor, serverId, formData);
  } catch (error) {
    await logAudit(
      actor.userId,
      serverId,
      auditAction,
      details,
      getErrorMessage(error),
    );
    throw new ServerError(getErrorMessage(error), "UploadFilesError");
  }

  const results = await Promise.allSettled(
    files.map((file) =>
      addMapAs(actor, serverId, `Downloaded/${dir}/${file.name}`),
    ),
  );
  const paths: string[] = [];
  const failed: string[] = [];
  results.forEach((result, index) => {
    // Re-adding a map that is already in the list still leaves it usable
    const present =
      result.status === "rejected" &&
      /already added/i.test(getErrorMessage(result.reason));
    if (result.status === "fulfilled" || present)
      paths.push(`Downloaded/${dir}/${files[index].name}`);
    else if (result.status === "rejected") {
      failed.push(files[index].name);
      log.warn(
        { err: result.reason, file: files[index].name, folder: dir },
        "Codriver could not add a map to the server",
      );
    }
  });

  await logAudit(
    actor.userId,
    serverId,
    auditAction,
    details,
    failed.length > 0 ? `Failed to add ${failed.length} maps` : undefined,
  );
  return { paths, failed };
}
