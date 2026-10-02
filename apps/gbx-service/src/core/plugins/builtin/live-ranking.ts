import type { LiveInfo, PlayerInfo, PlayerRound, Scores } from "@gcp/shared";
import { getSpectatorStatus, getTeamColors, TeamColors } from "../../live/points";
import type { Manialink } from "../../manialink/components/manialink";
import { definePlugin, type PluginContext, type PluginInstance } from "../sdk";

type Ranking = {
  login: string;
  name: string;
  rank: number;
  points: number;
  team: TeamColors;
};

class LiveRankingPlugin implements PluginInstance {
  private readonly widget: Manialink;
  private rankings: Ranking[] = [];
  private pointsLimit = -1;

  constructor(private readonly ctx: PluginContext) {
    this.widget = ctx.ui.widget({
      id: "live-ranking-widget",
      template: "widgets/live-ranking/live-ranking",
      position: { x: 100, y: 55 },
    });

    ctx.on("scores", (scores) => this.onScores(scores));
    ctx.on("beginMatch", () => this.reset());
    ctx.on("playerConnect", (player) => this.onPlayerConnect(player));
    ctx.on("playerDisconnect", (login) => this.onPlayerDisconnect(login));
    ctx.on("playerInfo", (player) => this.onPlayerInfo(player));
    ctx.on("updatedSettings", (info) => this.onUpdatedSettings(info));
    ctx.on("playerUpdated", (round) => this.onPlayerUpdated(round));
  }

  async start() {
    this.widget.display();
    await this.reset();
  }

  private teamColors(teamId: number): TeamColors {
    return getTeamColors(this.ctx.live.liveInfo.teams?.[teamId]?.name);
  }

  private isSpectating(player: PlayerInfo): boolean {
    return (
      getSpectatorStatus(player.spectatorStatus).spectator ||
      this.ctx.live.reverseCupGetPlayerStatus(player.login).spectator
    );
  }

  private onPlayerConnect(player: PlayerInfo) {
    if (this.isSpectating(player)) return;
    if (this.rankings.some((r) => r.login === player.login)) return;

    this.rankings.push({
      login: player.login,
      name: player.nickName,
      rank: 0,
      points: 0,
      team: this.teamColors(player.teamId),
    });
    this.render();
  }

  private onPlayerDisconnect(login: string) {
    if (!this.rankings.some((r) => r.login === login)) return;
    this.rankings = this.rankings.filter((r) => r.login !== login);
    this.render();
  }

  private onPlayerInfo(player: PlayerInfo) {
    const ranking = this.rankings.find((r) => r.login === player.login);

    if (this.isSpectating(player)) {
      // Keep spectators that already scored on the board
      if (!ranking || ranking.points > 0) return;
      this.rankings = this.rankings.filter((r) => r.login !== player.login);
    } else if (!ranking) {
      this.rankings.push({
        login: player.login,
        name: player.nickName,
        rank: 0,
        points: 0,
        team: this.teamColors(player.teamId),
      });
    } else {
      ranking.name = player.nickName;
      ranking.team = this.teamColors(player.teamId);
    }

    this.render();
  }

  private onPlayerUpdated(round: PlayerRound) {
    const ranking = this.rankings.find((r) => r.login === round.login);
    if (!ranking) return;
    ranking.points = round.matchPoints;
    this.render();
  }

  private onUpdatedSettings(info: LiveInfo) {
    this.pointsLimit = info.pointsLimit || -1;
    this.render();
  }

  private onScores(scores: Scores) {
    if (scores.responseid !== this.ctx.pluginId && scores.section !== "EndRound") return;

    const { live } = this.ctx;
    this.rankings = [];

    for (const player of scores.players) {
      if (live.liveInfo.type === "reversecup" && player.matchpoints === -10000) continue;

      if (player.matchpoints === 0) {
        const active = live.findActivePlayer(player.login);
        if (!active || getSpectatorStatus(active.spectatorStatus).spectator) continue;
      }

      this.rankings.push({
        rank: 0,
        login: player.login,
        name: player.name,
        points: player.matchpoints,
        team: this.teamColors(player.team),
      });
    }

    this.render();
  }

  private async reset() {
    this.pointsLimit = this.ctx.live.liveInfo.pointsLimit || -1;
    await this.ctx.gbx.callScript("Trackmania.GetScores", this.ctx.pluginId);
  }

  private render() {
    this.rankings.sort((a, b) => b.points - a.points);
    this.rankings.forEach((ranking, index) => (ranking.rank = index + 1));

    this.widget.setData({
      rankingsJson: JSON.stringify(this.rankings),
      mode: this.ctx.live.liveInfo.type,
      pointsLimit: this.pointsLimit,
    });
    this.widget.update();
  }
}

export const liveRankingPlugin = definePlugin({
  id: "live-ranking",
  gamemodes: ["rounds", "cup", "reversecup", "teams"],
  create: (ctx) => new LiveRankingPlugin(ctx),
});
