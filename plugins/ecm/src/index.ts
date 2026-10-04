import {
  definePlugin,
  rankPlayers,
  type ManialinkAnswer,
  type PluginContext,
  type Scores,
  type Waypoint,
  type Window,
} from "@tmcontrolpanel/plugin-sdk";

interface Config {
  apiKey?: string;
  isRecording?: boolean;
  editors?: string[];
}

const ECM_URL = "https://us-central1-fantasy-trackmania.cloudfunctions.net";
const ECM_ICON = "https://i.imgur.com/DIjT0pA.png";

// eCircuitMania keys look like "<matchId>_<token>"
export function isValidEcmApiKey(key: string | undefined): boolean {
  return !key || (key.match(/_/g) || []).length === 1;
}

function isEditor(config: Config, login: string): boolean {
  const editors = config.editors ?? [];
  return editors.length === 0 || editors.includes(login);
}

class ECMPlugin {
  private roundOffset = 0;
  private readonly activeDrivers = new Set<string>();
  private readonly windows = new Map<string, Window>();

  constructor(private readonly ctx: PluginContext<Config>) {
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
    ctx.action("open", (answer) => this.openWindow(answer.login));

    // Window buttons; every window shares the action names, so check the clicking login
    ctx.action("ecm-toggle-recording", (answer) => this.onToggleRecording(answer));
    ctx.action("ecm-save-api-key", (answer) => this.onSaveApiKey(answer));
    ctx.action("ecm-increase-round-offset", (answer) => this.onRoundOffset(answer, 1));
    ctx.action("ecm-decrease-round-offset", (answer) => this.onRoundOffset(answer, -1));
  }

  start() {
    this.ctx.ui.addButton({ name: "ecm", icon: ECM_ICON, type: "image", action: "open" });
  }

  onConfigUpdate() {
    this.refreshWindows();
  }

  private isActive(): boolean {
    const { live } = this.ctx;
    const { liveInfo } = live;
    const config = this.ctx.config();
    return (
      !!live.activeMapUid &&
      !liveInfo.isPaused &&
      !liveInfo.isWarmUp &&
      !!config.apiKey &&
      !!config.isRecording
    );
  }

  private roundNum(): number {
    return (this.ctx.live.roundNumber || 1) + this.roundOffset;
  }

  // Fire and forget: a failing report is logged, it never interrupts the game
  private async post(endpoint: string, body: unknown): Promise<void> {
    const [matchId, authToken] = (this.ctx.config().apiKey ?? "").split("_");
    if (!matchId || !authToken) {
      this.ctx.log.warn("Invalid eCircuitMania API key");
      return;
    }

    try {
      const response = await this.ctx.http.fetch(
        `${ECM_URL}/${endpoint}?matchId=${encodeURIComponent(matchId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authToken },
          body: JSON.stringify(body),
        },
      );
      if (response.status >= 400) {
        this.ctx.log.error("eCircuitMania request failed", {
          endpoint,
          status: response.status,
          body: response.body.slice(0, 500),
        });
      }
    } catch (error) {
      this.ctx.log.error("eCircuitMania request failed", { endpoint, error: String(error) });
    }
  }

  private onFinish(waypoint: Waypoint) {
    if (!this.isActive()) return;
    void this.post("match-addRoundTime", {
      finishTime: waypoint.racetime,
      ubisoftUid: waypoint.accountid,
      roundNum: this.roundNum(),
      mapId: this.ctx.live.activeMapUid,
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
      players = players.filter((p) => p.prevracetime !== -1 || this.activeDrivers.has(p.login));
    }

    void this.post("match-addRound", {
      players: rankPlayers(players, timeAttack).map((p) => ({
        finishTime: timeAttack ? p.bestracetime : p.prevracetime,
        ubisoftUid: p.accountid,
        position: p.position,
      })),
      roundNum: this.roundNum(),
      mapId: this.ctx.live.activeMapUid,
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
      apiKey: editor ? config.apiKey || "" : "",
      isRecording: config.isRecording || false,
      currentRound: this.roundNum(),
    };
  }

  private refreshWindows() {
    for (const [login, window] of this.windows) {
      window.setData(this.windowData(login));
      window.update();
    }
  }

  private canEdit(answer: ManialinkAnswer): boolean {
    return this.windows.has(answer.login) && isEditor(this.ctx.config(), answer.login);
  }

  private async onToggleRecording(answer: ManialinkAnswer) {
    if (!this.canEdit(answer)) return;
    const config = this.ctx.config();
    await this.ctx.saveConfig({ ...config, isRecording: !config.isRecording });
    this.refreshWindows();
  }

  private async onSaveApiKey(answer: ManialinkAnswer) {
    if (!this.canEdit(answer)) return;
    const apiKey = answer.entries["ecm-api-key-entry"];
    if (!isValidEcmApiKey(apiKey)) return;

    await this.ctx.saveConfig({ ...this.ctx.config(), apiKey });
    this.refreshWindows();
  }

  private onRoundOffset(answer: ManialinkAnswer, delta: number) {
    if (!this.canEdit(answer)) return;
    this.roundOffset += delta;
    this.refreshWindows();
  }
}

export default definePlugin<Config>({
  create: (ctx) => new ECMPlugin(ctx),
});
