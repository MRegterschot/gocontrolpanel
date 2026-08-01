import { FileManager } from "@/types/filemanager";
import { ServerError } from "@/types/responses";
import "server-only";
import { getClient } from "../dbclient";
import { appGlobals } from "../global";
import { reportException } from "../sentry/report";

export async function getFileManager(serverId: string): Promise<FileManager> {
  if (!appGlobals.fileManagers?.[serverId]) {
    const db = getClient();
    const server = await db.servers.findUnique({
      where: { id: serverId },
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
      return {
        url: server.filemanagerUrl || undefined,
        health: false,
      };
    }

    const res = await fetch(`${server.filemanagerUrl}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${server.filemanagerPassword}`,
      },
    });

    const fileManager = {
      url: server.filemanagerUrl,
      password: server.filemanagerPassword || undefined,
      health: res.status === 200,
    };

    appGlobals.fileManagers = appGlobals.fileManagers || {};
    appGlobals.fileManagers[serverId] = fileManager;

    return fileManager;
  }

  if (!appGlobals.fileManagers[serverId]) {
    const error = new ServerError(
      `FileManager with id ${serverId} not found`,
      "FileManagerNotFound",
    );
    reportException(error);
    throw error;
  }

  const fileManager = appGlobals.fileManagers[serverId];

  const res = await fetch(`${fileManager.url}/health`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${fileManager.password}`,
    },
  });

  fileManager.health = res.status === 200;

  return fileManager;
}

export async function getFileManagerHealth(serverId: string): Promise<boolean> {
  const fileManager = await getFileManager(serverId);
  return fileManager.health;
}

export async function updateFileManager(
  serverId: string,
  url?: string | null,
  password?: string | null,
) {
  if (!url) {
    return {
      url: url || undefined,
      health: false,
    };
  }

  const res = await fetch(`${url}/health`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${password}`,
    },
  });

  const fileManager = {
    url,
    password: password || undefined,
    health: res.status === 200,
  };

  appGlobals.fileManagers = appGlobals.fileManagers || {};
  appGlobals.fileManagers[serverId] = fileManager;

  return fileManager;
}
