import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession, requirePermission, type Actor } from "@/lib/actor";
import { callEach } from "@/lib/gbx-batch";
import { getGbxClient, type GbxClient } from "@/lib/gbx-service";
import { ServerResponse } from "@/types/responses";
import { PlayerInfo, serverPermissions } from "@tmcontrolpanel/shared";
import "server-only";

// One round trip for the whole list; a player the server no longer knows is shown by login only
async function getPlayerInfos(
  client: GbxClient,
  logins: string[],
): Promise<PlayerInfo[]> {
  const infos = await callEach(
    client,
    "GetPlayerInfo",
    logins.map((login) => [login]),
  );

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
    (session) => getPlayerListAs(actorFromSession(session), serverId),
  );
}

// The player list for an actor; the panel and the public API both call this
export async function getPlayerListAs(
  actor: Actor,
  serverId: string,
): Promise<PlayerInfo[]> {
  requirePermission(actor, serverPermissions.member, serverId);

  const client = getGbxClient(serverId);
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
}

const LIST_GETTERS = {
  banlist: "GetBanList",
  blacklist: "GetBlackList",
  guestlist: "GetGuestList",
} as const;

export type ListedPlayersName = keyof typeof LIST_GETTERS;

// The ban list, blacklist or guestlist for an actor; the panel and the public API both call this
export async function getListedPlayersAs(
  actor: Actor,
  serverId: string,
  list: ListedPlayersName,
): Promise<PlayerInfo[]> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  const entries = await client.call(LIST_GETTERS[list], 1000, 0);

  return getPlayerInfos(
    client,
    entries.map((player: { Login: string }) => player.Login),
  );
}

function listedPlayers(serverId: string, list: ListedPlayersName) {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    (session) => getListedPlayersAs(actorFromSession(session), serverId, list),
  );
}

export async function getBanList(
  serverId: string,
): Promise<ServerResponse<PlayerInfo[]>> {
  return listedPlayers(serverId, "banlist");
}

export async function getBlacklist(
  serverId: string,
): Promise<ServerResponse<PlayerInfo[]>> {
  return listedPlayers(serverId, "blacklist");
}

export async function getGuestlist(
  serverId: string,
): Promise<ServerResponse<PlayerInfo[]>> {
  return listedPlayers(serverId, "guestlist");
}
