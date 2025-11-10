import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import Widget from "@/lib/manialink/widget";
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
  private mode: "rounds" | "cup" = "rounds";

  constructor(clientManager: GbxClientManager) {
    super(clientManager);
    this.widget = new Widget(this.clientManager);
    this.widget.setTemplate("widgets/live-ranking/live-ranking.njk");
    this.widget.setId("live-ranking-widget");
    this.widget.setPosition("100 55");
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
    this.widget.hide();
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    this.widget.display();
    this.clearRankings();
  }

  async onPlayerConnect(playerInfo: PlayerInfo) {
    if (
      getSpectatorStatus(playerInfo.spectatorStatus).spectator ||
      this.rankings.find((r) => r.login === playerInfo.login)
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
    if (getSpectatorStatus(playerInfo.spectatorStatus).spectator) {
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
    }
    this.pointsLimit = this.clientManager.info.liveInfo.pointsLimit || -1;

    await this.clientManager.client.callScript(
      "Trackmania.GetScores",
      this.getPluginId(),
    );
  }
}
