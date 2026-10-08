"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { gbxService, getGbxClient } from "@/lib/gbx-service";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import {
  nextMapAs,
  pauseMatchAs,
  restartMapAs,
  setModeScriptSettingsAs,
  setScriptNameAs,
} from "./server-only/game";

export async function restartMap(serverId: string): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => restartMapAs(actorFromSession(session), serverId),
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
    (session) => nextMapAs(actorFromSession(session), serverId),
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
      const client = getGbxClient(serverId);
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
    (session) => setScriptNameAs(actorFromSession(session), serverId, script),
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
      await gbxService.loadMatchSettings(serverId, filename);

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
      const client = getGbxClient(serverId);
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
      const client = getGbxClient(serverId);
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
      const client = getGbxClient(serverId);
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
    (session) =>
      setModeScriptSettingsAs(actorFromSession(session), serverId, settings),
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
      const client = getGbxClient(serverId);
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
    (session) => pauseMatchAs(actorFromSession(session), serverId, pause),
  );
}
