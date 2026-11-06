"use server";
import { assertResourceId } from "@/lib/resource-id";

import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { ServerResponse } from "@/types/responses";
import {
  matchSettingsFileAs,
  nextMapAs,
  pauseMatchAs,
  restartMapAs,
  setModeScriptSettingsAs,
  setScriptNameAs,
  setShowOpponentsAs,
  triggerModeScriptEventAs,
} from "./server-only/game";

export async function restartMap(serverId: string): Promise<ServerResponse> {
  assertResourceId(serverId);
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
  assertResourceId(serverId);
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
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => setShowOpponentsAs(actorFromSession(session), serverId, count),
  );
}

export async function setScriptName(
  serverId: string,
  script: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
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
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) =>
      matchSettingsFileAs(
        actorFromSession(session),
        serverId,
        "load",
        filename,
      ),
  );
}

export async function appendPlaylist(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) =>
      matchSettingsFileAs(
        actorFromSession(session),
        serverId,
        "append",
        filename,
      ),
  );
}

export async function saveMatchSettings(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) =>
      matchSettingsFileAs(
        actorFromSession(session),
        serverId,
        "save",
        filename,
      ),
  );
}

export async function insertPlaylist(
  serverId: string,
  filename: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) =>
      matchSettingsFileAs(
        actorFromSession(session),
        serverId,
        "insert",
        filename,
      ),
  );
}

export async function setModeScriptSettings(
  serverId: string,
  settings: {
    [key: string]: string | number | boolean;
  },
): Promise<ServerResponse> {
  assertResourceId(serverId);
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
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) =>
      triggerModeScriptEventAs(
        actorFromSession(session),
        serverId,
        method,
        params,
      ),
  );
}

export async function pauseMatch(
  serverId: string,
  pause: boolean,
): Promise<ServerResponse> {
  assertResourceId(serverId);
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
