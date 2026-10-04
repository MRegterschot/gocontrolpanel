import {
  definePlugin,
  getSpectatorStatus,
  throttle,
  type MainServerPlayerInfo,
  type PlayerInfo,
  type PluginContext,
  type SPlayerInfo,
  type Waypoint,
  type WaypointEvent,
  type Widget,
} from "@tmcontrolpanel/plugin-sdk";

export type ActiveRun = {
  login: string;
  name: string;
  time: number;
  // Checkpoint count; FINISHED marks a completed run
  checkpoint: number;
};

// Sentinel understood by the widget template
export const FINISHED = -69;

// Furthest along first, finished runs last; ties broken by time
export function sortActiveRuns(runs: ActiveRun[]): ActiveRun[] {
  return [...runs].sort((a, b) => {
    if (a.checkpoint === FINISHED && b.checkpoint !== FINISHED) return 1;
    if (b.checkpoint === FINISHED && a.checkpoint !== FINISHED) return -1;
    if (a.checkpoint !== b.checkpoint) return b.checkpoint - a.checkpoint;
    return a.time - b.time;
  });
}

class TAActiveRunsPlugin {
  private readonly widget: Widget;
  private runs: ActiveRun[] = [];
  private readonly render: () => void;

  constructor(private readonly ctx: PluginContext) {
    this.widget = ctx.ui.widget({
      id: "ta-active-runs-widget",
      template: "widgets/ta-active-runs/ta-active-runs",
      position: { x: -156, y: 73.5 },
    });
    this.render = throttle(ctx, () => this.send(), 100);

    ctx.on("beginMap", () => this.reset());
    ctx.on("playerConnect", (player) => this.onPlayerConnect(player));
    ctx.on("playerInfo", (player) => this.onPlayerInfo(player));
    ctx.on("playerDisconnect", (login) => this.onPlayerDisconnect(login));
    ctx.on("startLine", (event) => this.resetRun(event));
    ctx.on("giveUp", (event) => this.resetRun(event));
    ctx.on("skipOutro", (event) => this.resetRun(event));
    ctx.on("checkpoint", (waypoint) => this.onCheckpoint(waypoint));
    ctx.on("finish", (waypoint) => this.onFinish(waypoint));
  }

  async start() {
    this.widget.display();
    await this.reset();
  }

  private onPlayerConnect(player: PlayerInfo) {
    if (getSpectatorStatus(player.spectatorStatus).spectator) return;
    if (this.runs.some((run) => run.login === player.login)) return;

    this.runs.push({ login: player.login, name: player.nickName, time: 0, checkpoint: 0 });
    this.render();
  }

  private onPlayerDisconnect(login: string) {
    if (!this.runs.some((run) => run.login === login)) return;
    this.runs = this.runs.filter((run) => run.login !== login);
    this.render();
  }

  private onPlayerInfo(player: PlayerInfo) {
    if (getSpectatorStatus(player.spectatorStatus).spectator) {
      this.runs = this.runs.filter((run) => run.login !== player.login);
    } else {
      const run = this.runs.find((r) => r.login === player.login);
      if (run) {
        run.time = 0;
        run.checkpoint = 0;
      } else {
        this.runs.push({ login: player.login, name: player.nickName, time: 0, checkpoint: 0 });
      }
    }
    this.render();
  }

  private resetRun(event: WaypointEvent) {
    const run = this.runs.find((r) => r.login === event.login);
    if (!run) return;
    run.time = 0;
    run.checkpoint = 0;
    this.render();
  }

  private onCheckpoint(waypoint: Waypoint) {
    const run = this.runs.find((r) => r.login === waypoint.login);
    if (!run) return;
    run.time = waypoint.racetime;
    run.checkpoint = waypoint.checkpointinrace + 1;
    this.render();
  }

  private onFinish(waypoint: Waypoint) {
    const run = this.runs.find((r) => r.login === waypoint.login);
    if (!run) return;
    run.time = waypoint.racetime;
    run.checkpoint = FINISHED;
    this.render();
  }

  private async reset() {
    const playerList = await this.ctx.gbx.call<SPlayerInfo[]>("GetPlayerList", 1000, 0);
    const mainServer = await this.ctx.gbx.call<MainServerPlayerInfo>("GetMainServerPlayerInfo");

    this.runs = (Array.isArray(playerList) ? playerList : [])
      .filter(
        (player) =>
          player.Login &&
          player.Login !== mainServer?.Login &&
          !getSpectatorStatus(player.SpectatorStatus).spectator,
      )
      .map((player) => ({ login: player.Login, name: player.NickName, time: 0, checkpoint: 0 }));

    this.render();
  }

  private send() {
    this.runs = sortActiveRuns(this.runs);
    this.widget.setData({ activeRunsJson: JSON.stringify(this.runs) });
    this.widget.update();
  }
}

export default definePlugin({
  create: (ctx) => new TAActiveRunsPlugin(ctx),
});
