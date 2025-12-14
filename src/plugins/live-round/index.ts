import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { getSpectatorStatus } from "@/lib/utils";
import { SPlayerInfo } from "@/types/gbx/player";
import { Scores } from "@/types/gbx/scores";
import { Waypoint, WaypointEvent } from "@/types/gbx/waypoint";
import { LiveInfo } from "@/types/live";
import { PlayerInfo } from "@/types/player";
import Plugin from "..";

type Round = {
  login: string;
  name: string;
  rank: number;
  points: number;
  checkpoints: number[];
  time: number;
};

type Finish = {
  login: string;
  points: number;
};

export default class LiveRoundPlugin extends Plugin {
  static pluginId = "live-round";
  static gamemodes = ["rounds", "cup"];
  private widget: Widget;

  private rounds: Round[] = [];
  private finishes: Finish[] = [];
  private pointsLimit: number = -1;
  private pointsRepartition: number[] = [];
  private mode: "rounds" | "cup" | "reversecup" = "rounds";

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager, manialinkManager);
    this.widget = new Widget(manialinkManager);
    this.widget.setTemplate("widgets/live-round/live-round");
    this.widget.setId("live-round-widget");
    this.widget.setPosition({ x: -156, y: 73.5 });
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {
      beginMap: this.onBeginMap.bind(this),
      playerConnect: this.onPlayerConnect.bind(this),
      playerInfo: this.onPlayerInfo.bind(this),
      playerDisconnect: this.onPlayerDisconnect.bind(this),
      startRound: this.onStartRound.bind(this),
      checkpoint: this.onCheckpoint.bind(this),
      finish: this.onFinish.bind(this),
      giveUp: this.onGiveUp.bind(this),
      updatedSettings: this.onUpdatedSettings.bind(this),
      scores: this.onScores.bind(this),
    });
  }

  async onUnload() {
    this.widget.destroy();
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    this.widget.display();
    this.clearLiveRound();
  }

  async onPlayerConnect(playerInfo: PlayerInfo) {
    if (
      getSpectatorStatus(playerInfo.spectatorStatus).spectator ||
      this.rounds.find((r) => r.login === playerInfo.login) ||
      this.clientManager.reverseCupIsSpectator(playerInfo.login)
    )
      return;

    this.rounds.push({
      login: playerInfo.login,
      name: playerInfo.nickName,
      rank: 0,
      time: 0,
      checkpoints: [],
      points: 0,
    });

    await this.updateWidget();
  }

  async onPlayerDisconnect(login: string) {
    const round = this.rounds.find((r) => r.login === login);
    if (!round) return;

    this.rounds = this.rounds.filter((r) => r.login !== login);
    await this.updateWidget();
  }

  async onPlayerInfo(playerInfo: PlayerInfo) {
    if (
      getSpectatorStatus(playerInfo.spectatorStatus).spectator ||
      this.clientManager.reverseCupIsSpectator(playerInfo.login)
    ) {
      this.rounds = this.rounds.filter((r) => r.login !== playerInfo.login);
    } else {
      const round = this.rounds.find((r) => r.login === playerInfo.login);

      if (!round) {
        this.rounds.push({
          login: playerInfo.login,
          name: playerInfo.nickName,
          rank: 0,
          time: 0,
          checkpoints: [],
          points: 0,
        });
      } else {
        for (let i = 0; i < this.rounds.length; i++) {
          if (this.rounds[i].login === playerInfo.login) {
            this.rounds[i].name = playerInfo.nickName;
            this.rounds[i].time = 0;
            this.rounds[i].checkpoints = [];
            break;
          }
        }
      }
    }

    await this.updateWidget();
  }

  async onStartRound() {
    this.clearLiveRound();
  }

  async onBeginMap() {
    this.clearLiveRound();
  }

  async onUpdatedSettings(liveInfo: LiveInfo) {
    if (liveInfo.type === "rounds" || liveInfo.type === "cup") {
      this.mode = liveInfo.type;

      if (liveInfo.mode === "TM_ReverseCup.Script.txt") {
        this.mode = "reversecup";
      }
    }
    this.pointsLimit = liveInfo.pointsLimit || -1;
    this.pointsRepartition = liveInfo.pointsRepartition || [];

    this.updateWidget();
  }

  async onCheckpoint(checkpoint: Waypoint) {
    if (this.clientManager.info.liveInfo.isWarmUp) return;

    for (let i = 0; i < this.rounds.length; i++) {
      if (this.rounds[i].login === checkpoint.login) {
        this.rounds[i].time = checkpoint.racetime;
        this.rounds[i].checkpoints = checkpoint.curracecheckpoints;

        await this.updateWidget();
        return;
      }
    }
  }

  async onFinish(finish: Waypoint) {
    if (this.clientManager.info.liveInfo.isWarmUp) return;

    for (let i = 0; i < this.rounds.length; i++) {
      if (this.rounds[i].login === finish.login) {
        this.rounds[i].time = finish.racetime;
        this.rounds[i].checkpoints = finish.curracecheckpoints;

        this.finishes.push({
          login: finish.login,
          points: this.pointsRepartition[this.finishes.length] || 0,
        });

        await this.updateWidget();
        return;
      }
    }
  }

  async onGiveUp(giveUp: WaypointEvent) {
    if (this.clientManager.info.liveInfo.isWarmUp) return;

    for (let i = 0; i < this.rounds.length; i++) {
      if (this.rounds[i].login === giveUp.login) {
        this.rounds[i].time = -1;

        await this.updateWidget();
        return;
      }
    }
  }

  async onScores(scores: Scores) {
    if (this.clientManager.info.liveInfo.isWarmUp) return;

    if (
      scores.responseid !== this.getPluginId() &&
      scores.section !== "EndRound"
    )
      return;

    for (let i = 0; i < scores.players.length; i++) {
      for (let j = 0; j < this.rounds.length; j++) {
        if (this.rounds[j].login === scores.players[i].login) {
          if (
            scores.players[i].matchpoints > this.pointsLimit &&
            this.pointsLimit > 0
          ) {
            this.rounds = this.rounds.filter(
              (r) => r.login !== scores.players[i].login,
            );
          } else {
            this.rounds[j].points = scores.players[i].matchpoints;
          }

          break;
        }
      }
    }

    this.rounds = this.rounds.filter(
      (r) =>
        this.clientManager.info.liveInfo.mode !== "TM_ReverseCup.Script.txt" ||
        r.points !== -10000,
    );

    await this.updateWidget();
  }

  async clearLiveRound() {
    const cmType = this.clientManager.info.liveInfo.type;
    if (cmType === "rounds" || cmType === "cup") {
      this.mode = cmType;
      if (this.clientManager.info.liveInfo.mode === "TM_ReverseCup.Script.txt") {
        this.mode = "reversecup";
      }
    }
    this.pointsLimit = this.clientManager.info.liveInfo.pointsLimit || -1;
    this.pointsRepartition =
      this.clientManager.info.liveInfo.pointsRepartition || [];

    const playerList: SPlayerInfo[] = await this.clientManager.client.call(
      "GetPlayerList",
      1000,
      0,
    );

    const mainServerInfo = await this.clientManager.client.call(
      "GetMainServerPlayerInfo",
    );

    this.finishes = [];
    this.rounds = [];

    if (playerList && Array.isArray(playerList)) {
      for (let i = 0; i < playerList.length; i++) {
        const player = playerList[i];
        if (!player.Login || player.Login === mainServerInfo.Login) {
          continue; // Skip the main server player
        }

        if (
          getSpectatorStatus(player.SpectatorStatus).spectator ||
          this.clientManager.reverseCupIsSpectator(player.Login)
        ) {
          continue; // Skip spectators
        }

        this.rounds.push({
          login: player.Login,
          name: player.NickName,
          rank: 0,
          time: 0,
          checkpoints: [],
          points: 0,
        });
      }
    }

    await this.clientManager.client.callScript(
      "Trackmania.GetScores",
      this.getPluginId(),
    );
  }

  async updateWidget() {
    this.rounds.sort((a, b) => {
      // Sort by checkpoint (count higher is better)
      if (b.checkpoints.length !== a.checkpoints.length) {
        return b.checkpoints.length - a.checkpoints.length;
      }

      // If checkpoints are equal, sort by time (lower is better)
      if (a.time !== b.time) {
        return a.time - b.time;
      }

      // If still equal, sort by fastest checkpoints recursively
      for (let i = 0; i < a.checkpoints.length; i++) {
        if (a.checkpoints[i] !== b.checkpoints[i]) {
          return a.checkpoints[i] - b.checkpoints[i];
        }
      }

      return 0;
    });

    for (let i = 0; i < this.rounds.length; i++) {
      this.rounds[i].rank = i + 1;
    }

    this.widget.setData({
      roundsJson: JSON.stringify(this.rounds),
      finishesJson: JSON.stringify(this.finishes),
      mode: this.mode,
      pointsLimit: this.pointsLimit,
    });
    this.widget.update();
  }
}
