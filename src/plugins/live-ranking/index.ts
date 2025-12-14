import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/components/widget";
import { getSpectatorStatus } from "@/lib/utils";
import { Scores } from "@/types/gbx/scores";
import { LiveInfo } from "@/types/live";
import { PlayerInfo } from "@/types/player";
import Plugin from "..";

type Ranking = {
  login: string;
  name: string;
  rank: number;
  points: number;
};

export default class LiveRankingPlugin extends Plugin {
  static pluginId = "live-ranking";
  static gamemodes = ["rounds", "cup"];
  private widget: Widget;

  private rankings: Ranking[] = [];
  private pointsLimit: number = -1;
  private mode: "rounds" | "cup" | "reversecup" = "rounds";

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager, manialinkManager);
    this.widget = new Widget(manialinkManager);
    this.widget.setTemplate("widgets/live-ranking/live-ranking");
    this.widget.setId("live-ranking-widget");
    this.widget.setPosition({ x: 100, y: 55 });
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {
      scores: this.onScores.bind(this),
      beginMatch: this.onBeginMatch.bind(this),
      playerConnect: this.onPlayerConnect.bind(this),
      playerDisconnect: this.onPlayerDisconnect.bind(this),
      playerInfo: this.onPlayerInfo.bind(this),
      updatedSettings: this.onUpdatedSettings.bind(this),
    });
  }

  async onUnload() {
    this.widget.destroy();
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    this.widget.display();
    this.clearRankings();
  }

  async onPlayerConnect(playerInfo: PlayerInfo) {
    if (
      getSpectatorStatus(playerInfo.spectatorStatus).spectator ||
      this.rankings.find((r) => r.login === playerInfo.login) ||
      this.clientManager.reverseCupIsSpectator(playerInfo.login)
    )
      return;

    this.rankings.push({
      login: playerInfo.login,
      name: playerInfo.nickName,
      rank: 0,
      points: 0,
    });

    await this.updateWidget();
  }

  async onPlayerDisconnect(login: string) {
    const ranking = this.rankings.find((r) => r.login === login);
    if (!ranking || ranking.points > 0) return;

    this.rankings = this.rankings.filter((r) => r.login !== login);
    await this.updateWidget();
  }

  async onPlayerInfo(playerInfo: PlayerInfo) {
    if (
      getSpectatorStatus(playerInfo.spectatorStatus).spectator ||
      this.clientManager.reverseCupIsSpectator(playerInfo.login)
    ) {
      const ranking = this.rankings.find((r) => r.login === playerInfo.login);
      if (!ranking || ranking.points > 0) return;

      this.rankings = this.rankings.filter((r) => r.login !== playerInfo.login);
    } else {
      const ranking = this.rankings.find((r) => r.login === playerInfo.login);

      if (!ranking) {
        this.rankings.push({
          login: playerInfo.login,
          name: playerInfo.nickName,
          rank: 0,
          points: 0,
        });
      } else {
        ranking.name = playerInfo.nickName;
      }
    }

    await this.updateWidget();
  }

  async onBeginMatch() {
    this.clearRankings();
  }

  async onUpdatedSettings(liveInfo: LiveInfo) {
    if (liveInfo.type === "rounds" || liveInfo.type === "cup") {
      this.mode = liveInfo.type;

      if (liveInfo.mode === "TM_ReverseCup.Script.txt") {
        this.mode = "reversecup";
      }
    }
    this.pointsLimit = liveInfo.pointsLimit || -1;

    this.updateWidget();
  }

  async onScores(scores: Scores) {
    if (
      scores.responseid !== this.getPluginId() &&
      scores.section !== "EndRound"
    )
      return;

    this.rankings = [];
    for (let i = 0; i < scores.players.length; i++) {
      const player = scores.players[i];

      if (
        this.clientManager.info.liveInfo.mode === "TM_ReverseCup.Script.txt" &&
        player.matchpoints === -10000
      ) {
        continue;
      }

      if (player.matchpoints === 0) {
        const activePlayer = this.clientManager.info.activePlayers.find(
          (p) => p.login === player.login,
        );

        if (
          activePlayer &&
          getSpectatorStatus(activePlayer.spectatorStatus).spectator
        ) {
          continue;
        }
      }

      this.rankings.push({
        rank: 0,
        login: player.login,
        name: player.name,
        points: player.matchpoints,
      });
    }

    await this.updateWidget();
  }

  async updateWidget() {
    this.rankings.sort((a, b) => b.points - a.points);

    for (let i = 0; i < this.rankings.length; i++) {
      this.rankings[i].rank = i + 1;
    }

    this.widget.setData({
      rankingsJson: JSON.stringify(this.rankings),
      mode: this.mode,
      pointsLimit: this.pointsLimit,
    });
    this.widget.update();
  }

  async clearRankings() {
    const cmType = this.clientManager.info.liveInfo.type;
    if (cmType === "rounds" || cmType === "cup") {
      this.mode = cmType;

      if (
        this.clientManager.info.liveInfo.mode === "TM_ReverseCup.Script.txt"
      ) {
        this.mode = "reversecup";
      }
    }
    this.pointsLimit = this.clientManager.info.liveInfo.pointsLimit || -1;

    await this.clientManager.client.callScript(
      "Trackmania.GetScores",
      this.getPluginId(),
    );
  }
}
