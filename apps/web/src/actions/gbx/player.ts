"use server";
import { assertResourceId } from "@/lib/resource-id";

import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { ServerResponse } from "@/types/responses";
import {
  addGuestAs,
  banPlayerAs,
  blacklistPlayerAs,
  cleanBanListAs,
  cleanPlayerListAs,
  forceSpectatorAs,
  kickPlayerAs,
  playerListFileAs,
  removeGuestAs,
  setPlayerMapPointsAs,
  setPlayerMatchPointsAs,
  setPlayerRoundPointsAs,
  setTeamMapPointsAs,
  setTeamMatchPointsAs,
  setTeamRoundPointsAs,
  unbanPlayerAs,
  unblacklistPlayerAs,
} from "./server-only/player";

export async function banPlayer(
  serverId: string,
  login: string,
  reason: string,
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
      banPlayerAs(actorFromSession(session), serverId, login, reason),
  );
}

export async function unbanPlayer(
  serverId: string,
  login: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => unbanPlayerAs(actorFromSession(session), serverId, login),
  );
}

export async function cleanBanList(serverId: string): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => cleanBanListAs(actorFromSession(session), serverId),
  );
}

export async function blacklistPlayer(
  serverId: string,
  login: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => blacklistPlayerAs(actorFromSession(session), serverId, login),
  );
}

export async function unblacklistPlayer(
  serverId: string,
  login: string,
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
      unblacklistPlayerAs(actorFromSession(session), serverId, login),
  );
}

export async function loadBlacklist(
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
      playerListFileAs(
        actorFromSession(session),
        serverId,
        "blacklist",
        "load",
        filename,
      ),
  );
}

export async function saveBlacklist(
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
      playerListFileAs(
        actorFromSession(session),
        serverId,
        "blacklist",
        "save",
        filename,
      ),
  );
}

export async function cleanBlacklist(
  serverId: string,
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
      cleanPlayerListAs(actorFromSession(session), serverId, "blacklist"),
  );
}

export async function addGuest(
  serverId: string,
  login: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => addGuestAs(actorFromSession(session), serverId, login),
  );
}

export async function removeGuest(
  serverId: string,
  login: string,
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => removeGuestAs(actorFromSession(session), serverId, login),
  );
}

export async function loadGuestlist(
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
      playerListFileAs(
        actorFromSession(session),
        serverId,
        "guestlist",
        "load",
        filename,
      ),
  );
}

export async function saveGuestlist(
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
      playerListFileAs(
        actorFromSession(session),
        serverId,
        "guestlist",
        "save",
        filename,
      ),
  );
}

export async function cleanGuestlist(
  serverId: string,
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
      cleanPlayerListAs(actorFromSession(session), serverId, "guestlist"),
  );
}

export async function kickPlayer(
  serverId: string,
  login: string,
  reason: string,
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
      kickPlayerAs(actorFromSession(session), serverId, login, reason),
  );
}

// Status: (0: user selectable, 1: spectator, 2: player, 3: spectator but keep selectable)
export async function forceSpectator(
  serverId: string,
  login: string,
  status: number,
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
      forceSpectatorAs(actorFromSession(session), serverId, login, status),
  );
}

export async function setPlayerRoundPoints(
  serverId: string,
  login: string,
  points: number,
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
      setPlayerRoundPointsAs(
        actorFromSession(session),
        serverId,
        login,
        points,
      ),
  );
}

export async function setPlayerMapPoints(
  serverId: string,
  login: string,
  points: number,
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
      setPlayerMapPointsAs(actorFromSession(session), serverId, login, points),
  );
}

export async function setPlayerMatchPoints(
  serverId: string,
  login: string,
  points: number,
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
      setPlayerMatchPointsAs(
        actorFromSession(session),
        serverId,
        login,
        points,
      ),
  );
}

export async function setTeamRoundPoints(
  serverId: string,
  teamId: number,
  points: number,
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
      setTeamRoundPointsAs(actorFromSession(session), serverId, teamId, points),
  );
}

export async function setTeamMapPoints(
  serverId: string,
  teamId: number,
  points: number,
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
      setTeamMapPointsAs(actorFromSession(session), serverId, teamId, points),
  );
}

export async function setTeamMatchPoints(
  serverId: string,
  teamId: number,
  points: number,
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
      setTeamMatchPointsAs(actorFromSession(session), serverId, teamId, points),
  );
}
