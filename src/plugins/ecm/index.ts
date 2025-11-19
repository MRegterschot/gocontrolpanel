import { ecmOnDriverFinish, ecmOnRoundEnd } from "@/lib/api/ecm";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import { rankPlayers } from "@/lib/utils";
import { Scores } from "@/types/gbx/scores";
import { Waypoint } from "@/types/gbx/waypoint";
import { ECMPluginConfig } from "@/types/plugins/ecm";
import Plugin from "..";

export default class ECMPlugin extends Plugin<ECMPluginConfig | null> {
  static pluginId = "ecm";
  private roundOffset: number = 0;

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager);
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {
      finish: this.onPlayerFinish.bind(this),
      scores: this.onEndRound.bind(this),
      beginMap: this.onBeginMap.bind(this),
    });
  }

  async onUnload() {
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {}

  async onPlayerFinish(waypoint: Waypoint) {
    if (!this.isActive()) return;

    ecmOnDriverFinish(this.config.apiKey, {
      finishTime: waypoint.racetime,
      ubisoftUid: waypoint.accountid,
      roundNum: this.clientManager.roundNumber || 1,
      mapId: this.clientManager.info.activeMap,
    });
  }

  async onEndRound(scores: Scores) {
    if (scores.section !== "EndRound") return;
    if (!this.isActive()) return;

    const roundNum = this.clientManager.roundNumber || 1;
    const isTimeAttack = this.clientManager.info.liveInfo.type === "timeattack";

    const rankedPlayers = rankPlayers(scores.players, isTimeAttack);

    const players = rankedPlayers.map((p) => ({
      finishTime: isTimeAttack ? p.bestracetime : p.prevracetime,
      ubisoftUid: p.accountid,
      position: p.position,
    }));

    ecmOnRoundEnd(this.config.apiKey, {
      players,
      roundNum,
      mapId: this.clientManager.info.activeMap,
    });
  }

  async onBeginMap() {
    this.roundOffset = 0;
  }

  private isActive(): this is {
    config: { apiKey: string, isRecording: true };
    clientManager: {
      info: {
        activeMap: string;
      };
    };
  } {
    return (
      !!this.clientManager.info.activeMap &&
      !this.clientManager.info.liveInfo.isPaused &&
      !this.clientManager.info.liveInfo.isWarmUp &&
      !!this.config?.apiKey &&
      !!this.config?.isRecording
    );
  }
}
