"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { getGbxClient } from "@/lib/gbx-service";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import {
  addGuestAs,
  banPlayerAs,
  blacklistPlayerAs,
  forceSpectatorAs,
  kickPlayerAs,
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
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = getGbxClient(serverId);
      await client.call("CleanBanList");
      await logAudit(session.user.id, serverId, "server.players.banlist.clear");
    },
  );
}

export async function blacklistPlayer(
  serverId: string,
  login: string,
): Promise<ServerResponse> {
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
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = getGbxClient(serverId);
      await client.call("LoadBlackList", filename);
      await logAudit(
        session.user.id,
        serverId,
        "server.players.blacklist.load",
        filename,
      );
    },
  );
}

export async function saveBlacklist(
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
      await client.call("SaveBlackList", filename);
      await logAudit(
        session.user.id,
        serverId,
        "server.players.blacklist.save",
        filename,
      );
    },
  );
}

export async function cleanBlacklist(
  serverId: string,
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
      await client.call("CleanBlackList");
      await logAudit(
        session.user.id,
        serverId,
        "server.players.blacklist.clear",
      );
    },
  );
}

export async function addGuest(
  serverId: string,
  login: string,
): Promise<ServerResponse> {
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
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const client = getGbxClient(serverId);
      await client.call("LoadGuestList", filename);
      await logAudit(
        session.user.id,
        serverId,
        "server.players.guestlist.load",
        filename,
      );
    },
  );
}

export async function saveGuestlist(
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
      await client.call("SaveGuestList", filename);
      await logAudit(
        session.user.id,
        serverId,
        "server.players.guestlist.save",
        filename,
      );
    },
  );
}

export async function cleanGuestlist(
  serverId: string,
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
      await client.call("CleanGuestList");
      await logAudit(
        session.user.id,
        serverId,
        "server.players.guestlist.clear",
      );
    },
  );
}

export async function kickPlayer(
  serverId: string,
  login: string,
  reason: string,
): Promise<ServerResponse> {
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
