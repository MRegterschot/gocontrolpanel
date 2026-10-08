import { uploadFilesAs } from "@/actions/filemanager/server-only/files";
import { addMapAs } from "@/actions/gbx/server-only/map";
import { type Actor, requirePermission } from "@/lib/actor";
import { downloadTMXMap } from "@/lib/api/tmx";
import { getLogger } from "@/lib/logger";
import { getFileManager } from "@/lib/managers/file-manager";
import { getErrorMessage } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import { serverPermissions } from "@gcp/shared";
import "server-only";
import { logAudit } from "../../database/server-only/audit-logs";

// Trackmania Exchange map operations for an actor; the Server Actions and Codriver both call these

// Downloads a map from TMX into the server's Downloaded folder and returns the file name
export async function downloadMapAs(
  actor: Actor,
  serverId: string,
  mapId: number,
): Promise<string> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const meta = {
    type: "tmx",
    module: "maps",
    function: "downloadMap",
  };
  const log = getLogger(serverId);
  const fileManager = await getFileManager(serverId);
  if (!fileManager?.health) {
    await logAudit(
      actor.userId,
      serverId,
      "server.tmx.map.download",
      mapId,
      "File manager is not healthy",
    );
    throw new ServerError(
      "File manager is not healthy",
      "FileManagerNotHealthy",
    );
  }

  const file = await downloadTMXMap(mapId);
  if (!file) {
    await logAudit(
      actor.userId,
      serverId,
      "server.tmx.map.download",
      mapId,
      "Failed to download map",
    );
    throw new ServerError("Failed to download map", "DownloadMapError");
  }

  const formData = new FormData();
  formData.append("files", file);
  formData.append("paths[]", `/UserData/Maps/Downloaded`);

  let error: string | undefined;
  try {
    await uploadFilesAs(actor, serverId, formData);
  } catch (e) {
    error = getErrorMessage(e);
  }

  await logAudit(
    actor.userId,
    serverId,
    "server.tmx.map.download",
    mapId,
    error,
  );

  if (error) {
    log.error({ meta, error, mapId }, "Failed to upload map");
    throw new ServerError(error, "UploadFilesError");
  }

  return file.name;
}

// Downloads a TMX map and adds it to the server's map list; returns its path in the maps folder
export async function addTmxMapToServerAs(
  actor: Actor,
  serverId: string,
  mapId: number,
): Promise<string> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const meta = {
    type: "tmx",
    module: "maps",
    function: "addMapToServer",
  };
  const log = getLogger(serverId);
  const fileManager = await getFileManager(serverId);
  if (!fileManager?.health) {
    await logAudit(
      actor.userId,
      serverId,
      "server.tmx.map.add",
      mapId,
      "File manager is not healthy",
    );
    throw new ServerError(
      "File manager is not healthy",
      "FileManagerNotHealthy",
    );
  }

  let fileName: string;
  try {
    fileName = await downloadMapAs(actor, serverId, mapId);
  } catch (e) {
    const error = getErrorMessage(e);
    await logAudit(actor.userId, serverId, "server.tmx.map.add", mapId, error);
    throw new ServerError(error, "DownloadMapError");
  }

  const path = `Downloaded/${fileName}`;
  let addMapError: string | undefined;
  try {
    await addMapAs(actor, serverId, path);
  } catch (e) {
    addMapError = getErrorMessage(e);
  }

  await logAudit(
    actor.userId,
    serverId,
    "server.tmx.map.add",
    mapId,
    addMapError,
  );

  if (addMapError) {
    log.error({ meta, addMapError, mapId }, "Failed to add map");
    throw new ServerError(addMapError, "AddMapError");
  }

  return path;
}
