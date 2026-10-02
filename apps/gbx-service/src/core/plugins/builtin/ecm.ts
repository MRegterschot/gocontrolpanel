import {
  ecmPluginConfigSchema,
  type ECMPluginConfig,
  type PlayerManialinkPageAnswer,
  type Scores,
  type Waypoint,
} from "@gcp/shared";
import { rankPlayers } from "../../live/points";
import type { Window } from "../../manialink/components/window";
import { definePlugin, type PluginContext, type PluginInstance } from "../sdk";

const ECM_ICON = "https://i.imgur.com/DIjT0pA.png";

// eCircuitMania keys look like "<matchId>_<token>"
export function isValidEcmApiKey(key: string | undefined): boolean {
  return !key || (key.match(/_/g) || []).length === 1;
}

function isEditor(config: ECMPluginConfig | null, login: string): boolean {
  const editors = config?.editors ?? [];
  return editors.length === 0 || editors.includes(login);
}

class ECMPlugin implements PluginInstance {
  private roundOffset = 0;
  private readonly activeDrivers = new Set<string>();
  private readonly windows = new Map<string, Window>();

  constructor(private readonly ctx: PluginContext<ECMPluginConfig>) {
    ctx.on("finish", (waypoint) => this.onFinish(waypoint));
    ctx.on("scores", (scores) => this.onScores(scores));
    ctx.on("beginMap", () => {
      this.roundOffset = 0;
      this.refreshWindows();
    });
    ctx.on("startRound", () => {
      this.activeDrivers.clear();
      this.refreshWindows();
    });
    ctx.on("startLine", (event) => this.activeDrivers.add(event.login));

    ctx.command("ecm", (_, login) => this.openWindow(login));
    ctx.action(ctx.pluginId, (answer) => this.openWindow(answer.Login));

    // Window buttons; every window shares the action names, so check the clicking login
    ctx.action("ecm-toggle-recording", (answer) => this.onToggleRecording(answer));
    ctx.action("ecm-save-api-key", (answer) => this.onSaveApiKey(answer));
    ctx.action("ecm-increase-round-offset", (answer) => this.onRoundOffset(answer, 1));
    ctx.action("ecm-decrease-round-offset", (answer) => this.onRoundOffset(answer, -1));
  }

  start() {
    this.ctx.ui.addAction({
      name: this.ctx.pluginId,
      icon: ECM_ICON,
      type: "image",
      action: this.ctx.pluginId,
    });
  }

  onConfigUpdate() {
    this.refreshWindows();
  }

  private isActive(): boolean {
    const { live } = this.ctx;
    const config = this.ctx.config();
    return (
      !!live.activeMapUid &&
      !live.liveInfo.isPaused &&
      !live.liveInfo.isWarmUp &&
      !!config?.apiKey &&
      !!config?.isRecording
    );
  }

  private roundNum(): number {
    return (this.ctx.live.roundNumber || 1) + this.roundOffset;
  }

  private onFinish(waypoint: Waypoint) {
    if (!this.isActive()) return;
    void this.ctx.ecm.driverFinish(this.ctx.config()!.apiKey!, {
      finishTime: waypoint.racetime,
      ubisoftUid: waypoint.accountid,
      roundNum: this.roundNum(),
      mapId: this.ctx.live.activeMapUid!,
    });
  }

  private onScores(scores: Scores) {
    const type = this.ctx.live.liveInfo.type;
    // Reverse cup results are final before the round end animation
    const expectedSection = type === "reversecup" ? "PreEndRound" : "EndRound";
    if (scores.section !== expectedSection) return;
    if (!this.isActive()) return;

    const timeAttack = type === "timeattack";
    let players = scores.players;
    if (type === "reversecup") {
      players = players.filter((p) => p.matchpoints > -2000);
    }
    // Outside TA, drivers that neither finished nor started are not part of the round
    if (!timeAttack) {
      players = players.filter(
        (p) => p.prevracetime !== -1 || this.activeDrivers.has(p.login),
      );
    }

    void this.ctx.ecm.roundEnd(this.ctx.config()!.apiKey!, {
      players: rankPlayers(players, timeAttack).map((p) => ({
        finishTime: timeAttack ? p.bestracetime : p.prevracetime,
        ubisoftUid: p.accountid,
        position: p.position,
      })),
      roundNum: this.roundNum(),
      mapId: this.ctx.live.activeMapUid!,
    });
  }

  private openWindow(login: string) {
    if (this.windows.has(login)) return;

    const window = this.ctx.ui.window({
      id: "ecm-window",
      template: "windows/ecm/ecm-window",
      login,
      title: "eCircuitMania",
      size: { x: 54, y: 32.5 },
      data: this.windowData(login),
      onClose: () => this.windows.delete(login),
    });

    this.windows.set(login, window);
    window.display();
  }

  private windowData(login: string) {
    const config = this.ctx.config();
    const editor = isEditor(config, login);
    return {
      isEditor: editor,
      apiKey: editor ? config?.apiKey || "" : "",
      isRecording: config?.isRecording || false,
      currentRound: this.roundNum(),
    };
  }

  private refreshWindows() {
    for (const [login, window] of this.windows) {
      window.setData(this.windowData(login));
      window.update();
    }
  }

  private canEdit(answer: PlayerManialinkPageAnswer): boolean {
    return this.windows.has(answer.Login) && isEditor(this.ctx.config(), answer.Login);
  }

  private async onToggleRecording(answer: PlayerManialinkPageAnswer) {
    if (!this.canEdit(answer)) return;
    const config = this.ctx.config();
    await this.ctx.saveConfig({ ...config, isRecording: !config?.isRecording });
    this.refreshWindows();
  }

  private async onSaveApiKey(answer: PlayerManialinkPageAnswer) {
    if (!this.canEdit(answer)) return;
    const apiKey = answer.Entries[0]?.Value;
    if (!isValidEcmApiKey(apiKey)) return;

    await this.ctx.saveConfig({ ...this.ctx.config(), apiKey });
    this.refreshWindows();
  }

  private onRoundOffset(answer: PlayerManialinkPageAnswer, delta: number) {
    if (!this.canEdit(answer)) return;
    this.roundOffset += delta;
    this.refreshWindows();
  }
}

export const ecmPlugin = definePlugin({
  id: "ecm",
  helpText: `This plugin sends rounds and finish data to eCircuitMania.
Commands: 
/ecm - Opens the eCircuitMania window
`,
  configSchema: ecmPluginConfigSchema,
  create: (ctx) => new ECMPlugin(ctx),
});
