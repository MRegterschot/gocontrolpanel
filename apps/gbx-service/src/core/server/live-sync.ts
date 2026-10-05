import type { MainServerPlayerInfo, SMapInfo, SPlayerInfo, ScriptName } from "@tmcp/shared";
import { TypedEventBus } from "../events";
import type { GbxConnection } from "../gbx/connection";
import type { LiveState } from "../live/live-state";
import {
  detectModeType,
  needsRankingForRepartition,
  parseScriptSettings,
} from "../live/modes";
import type { Logger } from "../logger";
import type { PlayerRepository } from "../ports";
import type { MapCatalog } from "./map-catalog";
import type { MatchRecorder } from "./match-recorder";
import { toPlayerInfo } from "./players";
import type { ServerEventMap } from "./server-events";

export const RESPONSE_ID = "tmcontrolpanel";

export interface LiveSyncDeps {
  gbx: GbxConnection;
  state: LiveState;
  bus: TypedEventBus<ServerEventMap>;
  players: PlayerRepository;
  catalog: MapCatalog;
  recorder: MatchRecorder;
  log: Logger;
}

// Pulls full state from the server: on connect, on BeginMatch and when settings change
export class LiveSync {
  constructor(private readonly deps: LiveSyncDeps) {}

  async syncPlayerList(): Promise<void> {
    const { gbx, state, bus, log } = this.deps;

    const playerList = await gbx.call<SPlayerInfo[]>("GetPlayerList", 1000, 0);
    if (!Array.isArray(playerList)) {
      throw new Error("Failed to retrieve player list");
    }
    const mainServer = await gbx.call<MainServerPlayerInfo>("GetMainServerPlayerInfo");

    const players = playerList
      .filter((player) => player.Login && player.Login !== mainServer?.Login)
      .map(toPlayerInfo);

    state.liveInfo.players = {};
    for (const player of players) {
      state.patchPlayer(player.login, {
        login: player.login,
        name: player.nickName,
        team: player.teamId,
      });
    }

    state.activePlayers = players;
    bus.emit("playerList", players);

    try {
      await this.deps.players.upsertMany(players);
    } catch (error) {
      log.error({ err: error }, "Failed to sync players to the database");
    }
  }

  async syncMap(): Promise<void> {
    const { gbx, state } = this.deps;
    const info = await gbx.call<SMapInfo>("GetCurrentMapInfo");
    if (!info) throw new Error("Failed to get current map info");

    const map = await this.deps.catalog.getOrCreate(info);
    state.activeMapRecord = map;
    state.activeMapUid = map.uid;
  }

  async syncLiveInfo(): Promise<void> {
    const { gbx, state, bus } = this.deps;

    await this.syncPlayerList();
    await gbx.callScript("Trackmania.WarmUp.GetStatus", RESPONSE_ID);

    const scriptName = await gbx.call<ScriptName>("GetScriptName");
    this.applyMode(scriptName.CurrentValue);
    if (state.modeChanged) {
      state.modeChanged = false;
      bus.emit("modeChange", state.liveInfo.type);
    }

    await this.deps.recorder.startMatch(state.liveInfo.mode);
    state.roundNumber = state.liveInfo.type === "timeattack" ? null : 0;

    const mapInfo = await gbx.call<SMapInfo>("GetCurrentMapInfo");
    state.liveInfo.currentMap = mapInfo.UId;

    await this.refreshScriptSettings();

    const mapList = await gbx.call<SMapInfo[]>("GetMapList", 1000, 0);
    state.liveInfo.maps = mapList.map((map) => map.UId);

    await gbx.callScript("Trackmania.GetScores", RESPONSE_ID);
    await gbx.callScript("Maniaplanet.Pause.GetStatus", RESPONSE_ID);
  }

  async refreshScriptSettings(): Promise<void> {
    const { gbx, state, log } = this.deps;
    const settings = await gbx.call<Record<string, unknown>>("GetModeScriptSettings");

    let rankingSize = 0;
    if (needsRankingForRepartition(state.liveInfo.type, settings)) {
      const ranking = await gbx.call<unknown[]>("GetCurrentRanking", 1000, 0);
      rankingSize = ranking.length;
    }

    state.applyScriptSettings(
      parseScriptSettings(state.liveInfo.type, settings, rankingSize, log),
    );
  }

  // On the podium the next script is already known; remember a type change for BeginMatch
  async prepareNextMode(): Promise<void> {
    const scriptName = await this.deps.gbx.call<ScriptName>("GetScriptName");
    this.applyMode(scriptName.NextValue);
  }

  private applyMode(scriptName: string): void {
    const { state } = this.deps;
    const previous = state.liveInfo.type;

    state.liveInfo.mode = scriptName;
    state.liveInfo.type = detectModeType(scriptName);

    if (previous && previous !== state.liveInfo.type) {
      state.modeChanged = true;
    }
  }
}
