import {
  GbxClientManager,
  getGbxClient,
} from "@/lib/managers/gbxclient-manager";
import { Maps } from "@/lib/prisma/generated";
import { getKeyActiveMap, getKeyJukebox, getRedisClient } from "@/lib/redis";
import { SMapInfo } from "@/types/gbx/map";
import { JukeboxMap } from "@/types/map";
import { PlayerInfo } from "@/types/player";
import { ServerError } from "@/types/responses";
import { GbxClient } from "@evotm/gbxclient";
import "server-only";
import {
  createMap,
  getMapByUid,
  syncPlayers,
} from "../database/server-only/gbx";

export async function syncPlayerList(manager: GbxClientManager) {
  const playerList  = await manager.client.call("GetPlayerList", 1000, 0);
  if (!playerList || !Array.isArray(playerList)) {
    throw new Error("Failed to retrieve player list");
  }

  const mainServerInfo = await manager.client.call("GetMainServerPlayerInfo");

  const players: PlayerInfo[] = [];
  manager.info.liveInfo.players = {};
  for (const player of playerList) {
    if (!player.Login || player.Login === mainServerInfo.Login) {
      continue; // Skip the main server player
    }

    try {
      players.push({
        nickName: player.NickName,
        login: player.Login,
        playerId: player.PlayerId,
        spectatorStatus: player.SpectatorStatus,
        teamId: player.TeamId,
      });

      manager.info.liveInfo.players[player.Login] = {
        ...manager.info.liveInfo.players[player.Login],
        login: player.Login,
        name: player.NickName,
        team: player.TeamId,
      };
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

  manager.info.activePlayers = players;
  manager.emit("playerList", players);
  await syncPlayers(players);
}

export async function getPlayerInfo(
  client: GbxClient,
  login: string,
): Promise<PlayerInfo> {
  const playerInfo = await client.call("GetPlayerInfo", login);
  if (!playerInfo) {
    throw new Error(`Player with login ${login} not found`);
  }

  return {
    nickName: playerInfo.NickName,
    login: playerInfo.Login,
    playerId: playerInfo.PlayerId,
    spectatorStatus: playerInfo.SpectatorStatus,
    teamId: playerInfo.TeamId,
  };
}

export async function onPodiumStart(serverId: string) {
  const redis = await getRedisClient();
  const key = getKeyJukebox(serverId);
  const items = await redis.lrange(key, 0, -1);

  if (items.length === 0) return;

  const nextRaw = items[0];
  const nextMap: JukeboxMap = JSON.parse(nextRaw);

  const client = await getGbxClient(serverId);
  await client.call("ChooseNextMap", nextMap.fileName);

  await redis.lpop(key);
}

export async function syncMap(
  manager: GbxClientManager,
  serverId: string,
): Promise<Maps> {
  const mapInfo: SMapInfo = await manager.client.call("GetCurrentMapInfo");

  if (!mapInfo) {
    throw new ServerError("Failed to get current map info");
  }

  let map = await getMapByUid(mapInfo.UId);
  if (!map) {
    const data = await createMap({
      name: mapInfo.Name,
      uid: mapInfo.UId,
      fileName: mapInfo.FileName,
      author: mapInfo.Author,
      authorNickname: mapInfo.AuthorNickname,
      authorTime: mapInfo.AuthorTime,
      goldTime: mapInfo.GoldTime,
      silverTime: mapInfo.SilverTime,
      bronzeTime: mapInfo.BronzeTime,
    });

    if (!data) {
      throw new ServerError(`Failed to create map`);
    }

    map = data;
  }

  manager.info.activeMap = map.uid;

  const redis = await getRedisClient();
  const key = getKeyActiveMap(serverId);

  await redis.set(key, JSON.stringify(map));

  return map;
}
