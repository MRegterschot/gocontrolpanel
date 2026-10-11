import { FileManager } from "@/types/filemanager";
import { ServerError } from "@/types/responses";
import "server-only";
import { getClient } from "../dbclient";
import { reportException } from "../sentry/report";

const HEALTH_TIMEOUT_MS = 5_000;

// Read from the database on every call, so a changed or removed URL/password applies at once
export async function getFileManager(serverId: string): Promise<FileManager> {
  const server = await getClient().servers.findFirst({
    where: { id: serverId, deletedAt: null },
    select: { filemanagerUrl: true, filemanagerPassword: true },
  });

  if (!server) {
    const error = new ServerError(
      `Server with id ${serverId} not found`,
      "ServerNotFound",
    );
    reportException(error);
    throw error;
  }

  if (!server.filemanagerUrl) {
    return { url: undefined, health: false };
  }

  const fileManager = {
    url: server.filemanagerUrl.replace(/\/+$/, ""),
    password: server.filemanagerPassword || undefined,
  };
  return { ...fileManager, health: await checkHealth(fileManager) };
}

async function checkHealth({
  url,
  password,
}: {
  url: string;
  password?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function getFileManagerHealth(serverId: string): Promise<boolean> {
  const fileManager = await getFileManager(serverId);
  return fileManager.health;
}

// Joins a caller-supplied path onto the file manager URL; the bearer token must never leave its origin
export function fileManagerUrl(baseUrl: string, path: string): string {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.split("/").some((segment) => isDotSegment(segment))
  ) {
    throw new ServerError("Invalid file path", "InvalidFilePath");
  }
  const base = new URL(baseUrl);
  const url = new URL(baseUrl + path);
  if (url.origin !== base.origin) {
    throw new ServerError("Invalid file path", "InvalidFilePath");
  }
  return url.toString();
}

function isDotSegment(segment: string): boolean {
  const decoded = segment.replace(/%2e/gi, ".");
  return decoded === "." || decoded === "..";
}
