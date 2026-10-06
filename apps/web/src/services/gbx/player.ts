import { doServerActionWithAuth } from "@/lib/actions";
import { callEach } from "@/lib/gbx-batch";
import { getGbxClient, type GbxClient } from "@/lib/gbx-service";
import { ServerResponse } from "@/types/responses";
import { PlayerInfo } from "@gcp/shared";
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
    async () => {
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
      const client = getGbxClient(serverId);
      const banList = await client.call("GetBanList", 1000, 0);

      return getPlayerInfos(
        client,
        banList.map((player: { Login: string }) => player.Login),
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
      const client = getGbxClient(serverId);
      const blacklist = await client.call("GetBlackList", 1000, 0);

      return getPlayerInfos(
        client,
        blacklist.map((player: { Login: string }) => player.Login),
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
      const client = getGbxClient(serverId);
      const guestlist = await client.call("GetGuestList", 1000, 0);

      return getPlayerInfos(
        client,
        guestlist.map((player: { Login: string }) => player.Login),
      );
    },
  );
}
