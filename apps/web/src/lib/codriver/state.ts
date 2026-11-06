import { getGbxClient } from "@/lib/gbx-service";
import "server-only";
import { stripFormatting } from "./text";
import { CodriverError } from "./types";

export interface LiveState {
  script: string;
  nextScript: string;
  map: { uid: string; name: string; author: string; fileName: string } | null;
  players: { login: string; nickName: string; spectator: boolean }[];
}

interface RawPlayer {
  Login: string;
  NickName: string;
  PlayerId: number;
  SpectatorStatus: number;
}

// What everyone on the server can already see in game, so it needs no role
export async function getLiveState(serverId: string): Promise<LiveState> {
  try {
    const [script, map, players] = await getGbxClient(serverId).multicall<
      [
        { CurrentValue: string; NextValue: string },
        { UId: string; Name: string; Author: string; FileName: string } | null,
        RawPlayer[],
      ]
    >([["GetScriptName"], ["GetCurrentMapInfo"], ["GetPlayerList", 1000, 0]]);

    return {
      script: script.CurrentValue,
      nextScript: script.NextValue,
      map: map
        ? {
            uid: map.UId,
            name: stripFormatting(map.Name),
            author: map.Author,
            fileName: map.FileName,
          }
        : null,
      players: (Array.isArray(players) ? players : [])
        // Id 0 is the server itself
        .filter((player) => player.PlayerId !== 0)
        .map((player) => ({
          login: player.Login,
          nickName: stripFormatting(player.NickName),
          // Units digit of SpectatorStatus is the spectator flag
          spectator: player.SpectatorStatus % 10 !== 0,
        })),
    };
  } catch {
    throw new CodriverError("The game server is not reachable right now.");
  }
}
