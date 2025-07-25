import { FileManager } from "@/types/filemanager";
import "server-only";
import { getClient } from "./dbclient";
import { appGlobals } from "./global";

export async function getFileManager(serverId: string): Promise<FileManager> {
  if (!appGlobals.fileManagers?.[serverId]) {
    const db = getClient();
    const server = await db.servers.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new Error(`Server with id ${serverId} not found`);
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
    throw new Error(`FileManager with id ${serverId} not found`);
  }

  return appGlobals.fileManagers[serverId];
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
