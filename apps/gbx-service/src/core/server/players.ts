import type { PlayerInfo, SPlayerInfo } from "@tmcp/shared";
import { AppError } from "../errors";
import type { GbxConnection } from "../gbx/connection";

export function toPlayerInfo(player: SPlayerInfo): PlayerInfo {
  return {
    login: player.Login,
    nickName: player.NickName,
    playerId: player.PlayerId,
    spectatorStatus: player.SpectatorStatus,
    teamId: player.TeamId,
  };
}

export async function fetchPlayerInfo(
  gbx: GbxConnection,
  login: string,
): Promise<PlayerInfo> {
  const player = await gbx.call<SPlayerInfo>("GetPlayerInfo", login);
  if (!player) {
    throw new AppError("PlayerNotFound", `Player with login ${login} not found`);
  }
  return toPlayerInfo(player);
}
