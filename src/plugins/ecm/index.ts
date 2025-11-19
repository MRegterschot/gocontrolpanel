import { ecmOnDriverFinish, ecmOnRoundEnd } from "@/lib/api/ecm";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { rankPlayers } from "@/lib/utils";
import { Scores } from "@/types/gbx/scores";
import { Waypoint } from "@/types/gbx/waypoint";
import { ECMPluginConfig } from "@/types/plugins/ecm";
import Plugin from "..";

export default class ECMPlugin extends Plugin<ECMPluginConfig | null> {
  static pluginId = "ecm";
  private widget: Widget;
  private roundOffset: number = 0;

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager, manialinkManager);
    this.widget = new Widget(manialinkManager, undefined, false);
    this.widget.setTemplate("widgets/ecm/ecm");
    this.widget.setId("ecm-widget");
    this.widget.setPosition("119 -70");
    this.widget.setData({
      ecmAction: "ecm-action",
    });
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {
      finish: this.onPlayerFinish.bind(this),
      scores: this.onEndRound.bind(this),
      beginMap: this.onBeginMap.bind(this),
    });

    this.clientManager.onCommand("ecm", this.onECMCommand.bind(this));
  }

  async onUnload() {
    this.clientManager.removeListeners(this.getPluginId());

    this.clientManager.offCommand("ecm", this.onECMCommand.bind(this));
  }

  async onStart() {}

  async onECMCommand(args: string[], login: string) {
    if (args.length === 0) {
      this.clientManager.client.call(
        "ChatSendServerMessageToLogin",
        `Round number: ${
          (this.clientManager.roundNumber || 1) + this.roundOffset
        } | Current offset: ${this.roundOffset}`,
        login,
      );
      return;
    }

    const subcommand = args[0];

    switch (subcommand) {
      case "offset":
        const offset = parseInt(args[1], 10);

        if (isNaN(offset)) {
          this.clientManager.client.call(
            "ChatSendServerMessageToLogin",
            "Invalid offset value",
            login,
          );
          return;
        }

        this.roundOffset = offset;

        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          `ECM round offset set to ${this.roundOffset}`,
          login,
        );
        break;
      default:
        this.clientManager.client.call(
          "ChatSendServerMessageToLogin",
          "Usage: /ecm offset <number>",
          login,
        );
        break;
    }
  }

  async onPlayerFinish(waypoint: Waypoint) {
    if (!this.isActive()) return;

    ecmOnDriverFinish(this.config.apiKey, {
      finishTime: waypoint.racetime,
      ubisoftUid: waypoint.accountid,
      roundNum: (this.clientManager.roundNumber || 1) + this.roundOffset,
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
      roundNum: roundNum + this.roundOffset,
      mapId: this.clientManager.info.activeMap,
    });
  }

  async onBeginMap() {
    this.roundOffset = 0;
  }

  private isActive(): this is {
    config: { apiKey: string; isRecording: true };
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
