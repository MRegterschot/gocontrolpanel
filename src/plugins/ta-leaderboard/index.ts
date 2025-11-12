import { getPlayerInfo } from "@/actions/gbx/server-only";
import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Widget from "@/lib/manialink/widget";
import Plugin from "@/plugins";
import { Scores } from "@/types/gbx/scores";
import { Waypoint } from "@/types/gbx/waypoint";
import { PlayerInfo } from "@/types/player";
import "server-only";

type Record = {
  rank: number;
  login: string;
  name: string;
  time: number;
};

export default class TALeaderboardPlugin extends Plugin {
  static pluginId = "ta-leaderboard";
  static gamemodes = ["timeattack"];
  private widget: Widget;
  records: Record[] = [];

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
  ) {
    super(clientManager);
    this.widget = new Widget(manialinkManager);
    this.widget.setTemplate("widgets/ta-leaderboard/ta-leaderboard");
    this.widget.setId("ta-leaderboard-widget");
    this.widget.setPosition("100 55");
  }

  async onLoad() {
    this.clientManager.addListeners(this.getPluginId(), {
      beginMap: this.onBeginMap.bind(this),
      finish: this.onPlayerFinish.bind(this),
      playerConnect: this.onPlayerConnect.bind(this),
      scores: this.onScores.bind(this),
    });
  }

  async onUnload() {
    this.widget.hide();
    this.clientManager.removeListeners(this.getPluginId());
  }

  async onStart() {
    this.widget.display();
    this.clearLeaderboard();
  }

  async onScores(scores: Scores) {
    if (scores.responseid !== this.getPluginId()) return;

    this.records = [];
    for (let i = 0; i < scores.players.length; i++) {
      const player = scores.players[i];
      this.records.push({
        rank: i + 1,
        login: player.login,
        name: player.name,
        time: player.bestracetime,
      });
    }

    this.records.sort((a, b) => a.time - b.time);

    for (let i = 0; i < this.records.length; i++) {
      this.records[i].rank = i + 1;
    }

    this.widget.setData({ recordsJson: JSON.stringify(this.records) });
    this.widget.update();
  }

  async onPlayerConnect(playerInfo: PlayerInfo) {
    const playerExists = this.records.some(
      (record) => record.login === playerInfo.login,
    );

    if (!playerExists) {
      this.records.push({
        rank: this.records.length + 1,
        login: playerInfo.login,
        name: playerInfo.nickName,
        time: -1,
      });

      this.widget.setData({ recordsJson: JSON.stringify(this.records) });
      this.widget.update();
    }
  }

  async onPlayerFinish(waypoint: Waypoint) {
    const playerExists = this.records.some(
      (record) => record.login === waypoint.login,
    );

    if (!playerExists) {
      const playerInfo = await getPlayerInfo(
        this.clientManager.client,
        waypoint.login,
      );

      this.records.push({
        rank: this.records.length + 1,
        login: waypoint.login,
        name: playerInfo.nickName,
        time: waypoint.racetime,
      });
    }

    for (let i = 0; i < this.records.length; i++) {
      if (this.records[i].login === waypoint.login) {
        if (
          this.records[i].time === -1 ||
          waypoint.racetime < this.records[i].time
        ) {
          this.records[i].time = waypoint.racetime;
          // Re-sort records
          this.records.sort((a, b) => a.time - b.time);
          // Update ranks
          for (let j = 0; j < this.records.length; j++) {
            this.records[j].rank = j + 1;
          }
          this.widget.setData({ recordsJson: JSON.stringify(this.records) });
          this.widget.update();
        }
        break;
      }
    }
  }

  private async onBeginMap() {
    this.clearLeaderboard();
  }

  private async clearLeaderboard() {
    await this.clientManager.client.callScript(
      "Trackmania.GetScores",
      this.getPluginId(),
    );
  }
}
