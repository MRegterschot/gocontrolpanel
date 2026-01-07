export interface PlayerInfo {
  login: string;
  nickName: string;
  playerId: number;
  spectatorStatus: number;
  teamId: number;
}

export interface ActivePlayerInfo extends PlayerInfo {
  device?: string;
  camera?: string;
}
