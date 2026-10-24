import { CreateFileEntrySchemaType } from "@/forms/server/files/create-file-entry-schema";
import {
  MoveFileEntriesSchema,
  MoveFileEntriesSchemaType,
} from "@/forms/server/files/move-file-entries-schema";
import { type Actor, requirePermission } from "@/lib/actor";
import { fileAuditDetails } from "@/lib/audit-redact";
import { getLogger } from "@/lib/logger";
import {
  fileManagerFetch,
  fileManagerUrl,
  getFileManager,
} from "@/lib/managers/file-manager";
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

  // Folder and file names come from users and from Nadeo/TMX names
  const badPath = uploadAuditData.paths.find(
    (path) => !path.startsWith("/") || hasDotSegment(path),
  );
  const badFile = uploadAuditData.files.find(
    (name) => /[\\/]/.test(name) || hasDotSegment(name),
  );
  if (badPath !== undefined || badFile !== undefined) {
    throw new ServerError("Invalid upload path", "InvalidFilePath");
  }

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

  const res = await fileManagerFetch(fileManager.url + "/upload", {
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

async function healthyFileManager(serverId: string) {
  const fileManager = await getFileManager(serverId);
  if (!fileManager?.health) {
    throw new ServerError(
      "Could not connect to file manager",
      "FileManagerNotHealthy",
    );
  }
  return fileManager;
}

// GET a file manager listing such as /scripts or /maps: paths relative to that folder
async function listFiles(serverId: string, route: string): Promise<string[]> {
  const fileManager = await healthyFileManager(serverId);
  const res = await fileManagerFetch(`${fileManager.url}${route}`, {
    headers: { Authorization: `Bearer ${fileManager.password}` },
  });
  if (res.status !== 200) {
    throw new ServerError(`Failed to list ${route}`, "FileFetchError");
  }
  const data: unknown = await res.json();
  return Array.isArray(data)
    ? data.filter((item): item is string => typeof item === "string")
    : [];
}

// Mode scripts under UserData/Scripts/Modes, such as "BNL/TM_Cup_BNL.Script.txt"
export async function listModeScriptsAs(
  actor: Actor,
  serverId: string,
): Promise<string[]> {
  requirePermission(actor, serverPermissions.admin, serverId);
  return listFiles(serverId, "/scripts");
}

// Map files under UserData/Maps, as the map list names them
export async function listMapFilesAs(
  actor: Actor,
  serverId: string,
): Promise<string[]> {
  requirePermission(actor, serverPermissions.admin, serverId);
  return listFiles(serverId, "/maps");
}

// `path` is relative to UserData, such as "Scripts/Modes/TM_Cup.Script.txt"
export async function readFileTextAs(
  actor: Actor,
  serverId: string,
  path: string,
): Promise<string> {
  requirePermission(actor, serverPermissions.admin, serverId);
  const fileManager = await healthyFileManager(serverId);
  const res = await fileManagerFetch(
    `${fileManager.url}/UserData/${encodePath(path)}`,
    {
      headers: { Authorization: `Bearer ${fileManager.password}` },
    },
  );
  if (res.status !== 200) {
    throw new ServerError("Failed to get file", "FileFetchError");
  }
  return res.text();
}

// Creates or overwrites a text file; the file manager creates missing folders
export async function writeFileTextAs(
  actor: Actor,
  serverId: string,
  path: string,
  text: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);
  const fileManager = await getFileManager(serverId);
  if (!fileManager?.health) {
    await logAudit(
      actor.userId,
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
    `${fileManager.url}/UserData/${encodePath(path)}`,
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
    actor.userId,
    serverId,
    "server.files.edit",
    fileAuditDetails(path, text),
    res.status !== 200 ? "Failed to save file" : undefined,
  );
  if (res.status !== 200) {
    getLogger(serverId).error(
      { path, status: res.status, body: await res.text() },
      "Failed to save file",
    );
    throw new ServerError("Failed to save file", "FileSaveError");
  }
}

// `paths` are absolute, such as /UserData/Maps/a.Map.Gbx
export async function deleteEntriesAs(
  actor: Actor,
  serverId: string,
  paths: string[],
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const fileManager = await getFileManager(serverId);
  if (!fileManager?.health) {
    await logAudit(
      actor.userId,
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

  const res = await fileManagerFetch(fileManager.url + "/delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${fileManager.password}`,
    },
    body: JSON.stringify(paths),
  });

  await logAudit(
    actor.userId,
    serverId,
    "server.files.delete",
    paths,
    res.status !== 200 ? "Failed to delete item" : undefined,
  );

  if (res.status !== 200) {
    throw new ServerError("Failed to delete item", "FileDeleteError");
  }
}

// Creates a file or folder; `request.path` is relative to UserData, such as Maps/Event
export async function createEntryAs(
  actor: Actor,
  serverId: string,
  request: CreateFileEntrySchemaType,
): Promise<FileEntry> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const fileManager = await getFileManager(serverId);
  if (!fileManager?.health) {
    await logAudit(
      actor.userId,
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

  const res = await fileManagerFetch(fileManager.url + "/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${fileManager.password}`,
    },
    body: JSON.stringify(request),
  });

  if (res.status !== 200) {
    // A body can only be read once
    const message =
      res.status === 500 ? "Something went wrong" : await res.text();
    await logAudit(
      actor.userId,
      serverId,
      "server.files.create",
      request,
      message,
    );
    throw new ServerError(
      message,
      res.status === 409 ? "FileExists" : "FileCreateError",
    );
  }

  const data = await res.json();

  await logAudit(
    actor.userId,
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
}

// Moves or renames entries; paths are absolute
export async function moveEntriesAs(
  actor: Actor,
  serverId: string,
  request: MoveFileEntriesSchemaType,
): Promise<FileEntry[]> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const parsed = MoveFileEntriesSchema.safeParse(request);
  if (!parsed.success) {
    throw new ServerError("Invalid move request", "FileMoveError");
  }

  const fileManager = await getFileManager(serverId);
  if (!fileManager?.health) {
    await logAudit(
      actor.userId,
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

  const res = await fileManagerFetch(fileManager.url + "/move", {
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
      actor.userId,
      serverId,
      "server.files.move",
      parsed.data,
      message,
    );
    throw new ServerError(message, "FileMoveError");
  }

  const data = await res.json();

  await logAudit(actor.userId, serverId, "server.files.move", parsed.data);

  return data.map(
    (entry: Omit<FileEntry, "lastModified"> & { lastModified: string }) => ({
      ...entry,
      lastModified: new Date(entry.lastModified),
    }),
  );
}

// The file's bytes as stored, whatever its type; `path` is absolute, such as /UserData/Maps/a.Map.Gbx
export async function readFileBytesAs(
  actor: Actor,
  serverId: string,
  path: string,
): Promise<Buffer> {
  requirePermission(actor, serverPermissions.admin, serverId);
  const fileManager = await healthyFileManager(serverId);
  const res = await fileManagerFetch(fileManagerUrl(fileManager.url!, path), {
    headers: { Authorization: `Bearer ${fileManager.password}` },
  });
  if (res.status === 404) {
    throw new ServerError("File not found", "NotFound");
  }
  if (res.status !== 200) {
    throw new ServerError("Failed to get file", "FileFetchError");
  }
  return Buffer.from(await res.arrayBuffer());
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function hasDotSegment(path: string): boolean {
  return path
    .split(/[\\/]/)
    .some((segment) => segment === "." || segment === "..");
}
