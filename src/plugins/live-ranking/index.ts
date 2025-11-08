import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import Widget from "@/lib/manialink/widget";
import { Scores } from "@/types/gbx/scores";
import { LiveInfo } from "@/types/live";
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
    });

    const cmType = this.clientManager.info.liveInfo.type;
    if (cmType === "rounds" || cmType === "cup") {
      this.mode = cmType;
    }
    this.pointsLimit = this.clientManager.info.liveInfo.pointsLimit || -1;
  }

  async onUnload() {
    this.widget.hide();
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    this.widget.display();
    this.clearRankings();
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
        rank: i + 1,
        login: player.login,
        name: player.name,
        points: player.matchpoints,
      });
    }

    this.rankings.sort((a, b) => b.points - a.points);

    for (let i = 0; i < this.rankings.length; i++) {
      this.rankings[i].rank = i + 1;
    }

    await this.updateWidget();
  }

  async updateWidget() {
    this.widget.setData({
      rankingsJson: JSON.stringify(this.rankings),
      mode: this.mode,
      pointsLimit: this.pointsLimit,
    });
    this.widget.update();
  }

  async clearRankings() {
    await this.clientManager.client.callScript(
      "Trackmania.GetScores",
      this.getPluginId(),
    );
  }
}
