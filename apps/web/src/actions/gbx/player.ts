"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { callEach } from "@/lib/gbx-batch";
import { gbxService, getGbxClient, type GbxClient } from "@/lib/gbx-service";
import { PlayerInfo } from "@gcp/shared";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";

// One round trip for the whole list; a player the server no longer knows is shown by login only
async function getPlayerInfos(client: GbxClient, logins: string[]): Promise<PlayerInfo[]> {
  const infos = await callEach(client, "GetPlayerInfo", logins.map((login) => [login]));

  return logins.map((login, i) => {
    const info = infos[i];
    return info
      ? {
          nickName: info.NickName,
          login: info.Login,
          playerId: info.PlayerId,
          spectatorStatus: info.SpectatorStatus,
          teamId: info.TeamId,
        }
      : { nickName: "-", login, playerId: 0, spectatorStatus: 0, teamId: 0 };
  });
}

export async function getPlayerList(
  serverId: string,
): Promise<ServerResponse<PlayerInfo[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:member`,
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:member`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);
      const playerList = await client.call("GetPlayerList", 1000, 0);

      if (!playerList || !Array.isArray(playerList)) {
        return [];
      }

      const players: PlayerInfo[] = [];
      for (const player of playerList) {
        try {
          players.push({
            nickName: player.NickName,
            login: player.Login,
            playerId: player.PlayerId,
            spectatorStatus: player.SpectatorStatus,
            teamId: player.TeamId,
          });
        } catch {
          players.push({
            nickName: "-",
            login: player.Login,
            playerId: 0,
            spectatorStatus: 0,
            teamId: 0,
          });
        }
      }

      return players;
    },
  );
}

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
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("Ban", login, reason);
      await logAudit(session.user.id, serverId, "server.players.banlist.add", {
        login,
        reason,
      });
    },
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
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("UnBan", login);
      await logAudit(
        session.user.id,
        serverId,
        "server.players.banlist.remove",
        login,
      );
    },
  );
}

export async function getBanList(
  serverId: string,
): Promise<ServerResponse<PlayerInfo[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);
      const banList = await client.call("GetBanList", 1000, 0);

      return getPlayerInfos(client, banList.map((player: { Login: string }) => player.Login));
    },
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
      const client = await getGbxClient(serverId);
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
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("BlackList", login);
      await logAudit(
        session.user.id,
        serverId,
        "server.players.blacklist.add",
        login,
      );
    },
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
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("UnBlackList", login);
      await logAudit(
        session.user.id,
        serverId,
        "server.players.blacklist.remove",
        login,
      );
    },
  );
}

export async function getBlacklist(
  serverId: string,
): Promise<ServerResponse<PlayerInfo[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);
      const blacklist = await client.call("GetBlackList", 1000, 0);

      return getPlayerInfos(client, blacklist.map((player: { Login: string }) => player.Login));
    },
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
      const client = await getGbxClient(serverId);
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
      const client = await getGbxClient(serverId);
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
      const client = await getGbxClient(serverId);
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
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("AddGuest", login);
      await logAudit(
        session.user.id,
        serverId,
        "server.players.guestlist.add",
        login,
      );
    },
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
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("RemoveGuest", login);
      await logAudit(
        session.user.id,
        serverId,
        "server.players.guestlist.remove",
        login,
      );
    },
  );
}

export async function getGuestlist(
  serverId: string,
): Promise<ServerResponse<PlayerInfo[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);
      const guestlist = await client.call("GetGuestList", 1000, 0);

      return getPlayerInfos(client, guestlist.map((player: { Login: string }) => player.Login));
    },
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
      const client = await getGbxClient(serverId);
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
      const client = await getGbxClient(serverId);
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
      const client = await getGbxClient(serverId);
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
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("Kick", login, reason);
      await logAudit(session.user.id, serverId, "server.players.kick", {
        login,
        reason,
      });
    },
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
    async (session) => {
      const client = await getGbxClient(serverId);
      await client.call("ForceSpectator", login, status);
      await logAudit(
        session.user.id,
        serverId,
        "server.players.spectator.set",
        { login, status },
      );
    },
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
    async (session) => {
      await gbxService.setPlayerPoints(serverId, login, "round", points);

      await logAudit(
        session.user.id,
        serverId,
        "server.players.roundpoints.set",
        { login, points },
      );
    },
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
    async (session) => {
      await gbxService.setPlayerPoints(serverId, login, "map", points);

      await logAudit(
        session.user.id,
        serverId,
        "server.players.mappoints.set",
        { login, points },
      );
    },
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
    async (session) => {
      await gbxService.setPlayerPoints(serverId, login, "match", points);

      await logAudit(
        session.user.id,
        serverId,
        "server.players.matchpoints.set",
        { login, points },
      );
    },
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
    async (session) => {
      await gbxService.setTeamPoints(serverId, teamId, "round", points);

      await logAudit(
        session.user.id,
        serverId,
        "server.players.team.roundpoints.set",
        { teamId, points },
      );
    },
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
    async (session) => {
      await gbxService.setTeamPoints(serverId, teamId, "map", points);

      await logAudit(
        session.user.id,
        serverId,
        "server.players.team.mappoints.set",
        { teamId, points },
      );
    },
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
    async (session) => {
      await gbxService.setTeamPoints(serverId, teamId, "match", points);

      await logAudit(
        session.user.id,
        serverId,
        "server.players.team.matchpoints.set",
        { teamId, points },
      );
    },
  );
}
