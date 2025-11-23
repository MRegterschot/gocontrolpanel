"use server";
import { doServerActionWithAuth } from "@/lib/actions";
import {
  getGbxClient,
  getGbxClientManager,
} from "@/lib/managers/gbxclient-manager";
import { ModeScriptInfo } from "@/types/gbx";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";

export async function restartMap(serverId: string): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("RestartMap");
      await logAudit(session.user.id, serverId, "server.game.map.restart");
    },
  );
}

export async function nextMap(serverId: string): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("NextMap");
      await logAudit(session.user.id, serverId, "server.game.map.next");
    },
  );
}

export async function setShowOpponents(
  serverId: string,
  count: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("SetForceShowAllOpponents", count);
      await logAudit(
        session.user.id,
        serverId,
        "server.game.showopponents.edit",
        count,
      );
    },
  );
}

export async function getShowOpponents(serverId: string): Promise<
  ServerResponse<{
    CurrentValue: number;
    NextValue: number;
  }>
> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);
      return await client.call("GetForceShowAllOpponents");
    },
  );
}

export async function setScriptName(
  serverId: string,
  script: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("SetScriptName", script);
      await logAudit(
        session.user.id,
        serverId,
        "server.game.script.edit",
        script,
      );
    },
  );
}

export async function getScriptName(serverId: string): Promise<
  ServerResponse<{
    CurrentValue: string;
    NextValue: string;
  }>
> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);
      return await client.call("GetScriptName");
    },
  );
}

export async function loadMatchSettings(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("LoadMatchSettings", filename);
      await logAudit(
        session.user.id,
        serverId,
        "server.game.matchsettings.load",
        filename,
      );
    },
  );
}

export async function appendPlaylist(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("AppendPlaylistFromMatchSettings", filename);
      await logAudit(
        session.user.id,
        serverId,
        "server.game.playlist.append",
        filename,
      );
    },
  );
}

export async function saveMatchSettings(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("SaveMatchSettings", filename);
      await logAudit(
        session.user.id,
        serverId,
        "server.game.matchsettings.save",
        filename,
      );
    },
  );
}

export async function insertPlaylist(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("InsertPlaylistFromMatchSettings", filename);
      await logAudit(
        session.user.id,
        serverId,
        "server.game.playlist.insert",
        filename,
      );
    },
  );
}

export async function getModeScriptInfo(
  serverId: string,
): Promise<ServerResponse<ModeScriptInfo>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);
      return await client.call("GetModeScriptInfo");
    },
  );
}

export async function getModeScriptSettings(serverId: string): Promise<
  ServerResponse<{
    [key: string]: string | number | boolean;
  }>
> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);
      return await client.call("GetModeScriptSettings");
    },
  );
}

export async function setModeScriptSettings(
  serverId: string,
  settings: {
    [key: string]: string | number | boolean;
  },
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("SetModeScriptSettings", settings);
      client.call("Echo", "", "UpdatedSettings");
      await logAudit(
        session.user.id,
        serverId,
        "server.game.scriptsettings.edit",
        settings,
      );
    },
  );
}

export async function triggerModeScriptEventArray(
  serverId: string,
  method: string,
  params: string[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("TriggerModeScriptEventArray", method, params);
      await logAudit(session.user.id, serverId, "server.live.scriptevent", {
        method,
        params,
      });
    },
  );
}

export async function pauseMatch(
  serverId: string,
  pause: boolean,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const { error } = await triggerModeScriptEventArray(
        serverId,
        "Maniaplanet.Pause.SetActive",
        pause ? ["true"] : ["false"],
      );

      await logAudit(
        session.user.id,
        serverId,
        "server.live.pause",
        pause,
        error,
      );

      if (error) {
        throw new Error(error);
      }

      if (pause) {
        const manager = await getGbxClientManager(serverId);
        manager.info.liveInfo.isPaused = true;
        if (manager.roundNumber !== null) {
          manager.roundNumber--;
        }
      }
    },
  );
}
