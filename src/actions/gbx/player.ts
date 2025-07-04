"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClient } from "@/lib/gbxclient";
import { getKeyPlayers, getRedisClient } from "@/lib/redis";
import { PlayerInfo } from "@/types/player";
import { ServerResponse } from "@/types/responses";
import { GbxClient } from "@evotm/gbxclient";

export async function getPlayerList(
  serverUuid: string,
): Promise<ServerResponse<PlayerInfo[]>> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
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
  });
}

export async function banPlayer(
  serverUuid: string,
  login: string,
  reason: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("Ban", login, reason);
  });
}

export async function unbanPlayer(
  serverUuid: string,
  login: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("UnBan", login);
  });
}

export async function getBanList(
  serverUuid: string,
): Promise<ServerResponse<PlayerInfo[]>> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    const banList = await client.call("GetBanList", 1000, 0);

    const playerList: PlayerInfo[] = [];
    for (const player of banList) {
      try {
        const playerInfo = await client.call("GetPlayerInfo", player.Login);
        playerList.push({
          nickName: playerInfo.NickName,
          login: playerInfo.Login,
          playerId: playerInfo.PlayerId,
          spectatorStatus: playerInfo.SpectatorStatus,
          teamId: playerInfo.TeamId,
        });
      } catch {
        playerList.push({
          nickName: "-",
          login: player.Login,
          playerId: 0,
          spectatorStatus: 0,
          teamId: 0,
        });
      }
    }

    return playerList;
  });
}

export async function cleanBanList(
  serverUuid: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("CleanBanList");
  });
}

export async function blacklistPlayer(
  serverUuid: string,
  login: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("BlackList", login);
  });
}

export async function unblacklistPlayer(
  serverUuid: string,
  login: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("UnBlackList", login);
  });
}

export async function getBlacklist(
  serverUuid: string,
): Promise<ServerResponse<PlayerInfo[]>> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    const blacklist = await client.call("GetBlackList", 1000, 0);

    const playerList: PlayerInfo[] = [];
    for (const player of blacklist) {
      try {
        const playerInfo = await client.call("GetPlayerInfo", player.Login);
        playerList.push({
          nickName: playerInfo.NickName,
          login: playerInfo.Login,
          playerId: playerInfo.PlayerId,
          spectatorStatus: playerInfo.SpectatorStatus,
          teamId: playerInfo.TeamId,
        });
      } catch {
        playerList.push({
          nickName: "-",
          login: player.Login,
          playerId: 0,
          spectatorStatus: 0,
          teamId: 0,
        });
      }
    }

    return playerList;
  });
}

export async function loadBlacklist(
  serverUuid: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("LoadBlackList", filename);
  });
}

export async function saveBlacklist(
  serverUuid: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("SaveBlackList", filename);
  });
}

export async function cleanBlacklist(
  serverUuid: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("CleanBlackList");
  });
}

export async function addGuest(
  serverUuid: string,
  login: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("AddGuest", login);
  });
}

export async function removeGuest(
  serverUuid: string,
  login: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("RemoveGuest", login);
  });
}

export async function getGuestlist(
  serverUuid: string,
): Promise<ServerResponse<PlayerInfo[]>> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    const guestlist = await client.call("GetGuestList", 1000, 0);

    const playerList: PlayerInfo[] = [];
    for (const player of guestlist) {
      try {
        const playerInfo = await client.call("GetPlayerInfo", player.Login);
        playerList.push({
          nickName: playerInfo.NickName,
          login: playerInfo.Login,
          playerId: playerInfo.PlayerId,
          spectatorStatus: playerInfo.SpectatorStatus,
          teamId: playerInfo.TeamId,
        });
      } catch {
        playerList.push({
          nickName: "-",
          login: player.Login,
          playerId: 0,
          spectatorStatus: 0,
          teamId: 0,
        });
      }
    }

    return playerList;
  });
}

export async function loadGuestlist(
  serverUuid: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("LoadGuestList", filename);
  });
}

export async function saveGuestlist(
  serverUuid: string,
  filename: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("SaveGuestList", filename);
  });
}

export async function cleanGuestlist(
  serverUuid: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("CleanGuestList");
  });
}

export async function kickPlayer(
  serverUuid: string,
  login: string,
  reason: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("Kick", login, reason);
  });
}

// Status: (0: user selectable, 1: spectator, 2: player, 3: spectator but keep selectable)
export async function forceSpectator(
  serverUuid: string,
  login: string,
  status: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("ForceSpectator", login, status);
  });
}

export async function connectFakePlayer(
  serverUuid: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    const client = await getGbxClient(serverUuid);
    await client.call("ConnectFakePlayer");
  });
}

export async function syncPlayerList(client: GbxClient, serverUuid: string) {
  const playerList = await client.call("GetPlayerList", 1000, 0);
  if (!playerList || !Array.isArray(playerList)) {
    throw new Error("Failed to retrieve player list");
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

  const redis = await getRedisClient();
  const key = getKeyPlayers(serverUuid);

  await redis.set(key, JSON.stringify(players));
}
