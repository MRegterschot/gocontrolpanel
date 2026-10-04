import {
  definePlugin,
  loginToAccountId,
  type PlayerInfo,
  type PluginContext,
  type SMapInfo,
  type Waypoint,
  type Widget,
} from "@tmcontrolpanel/plugin-sdk";

interface Config {
  playerInfos?: { login: string; device?: string; camera?: string }[];
}

type PlayerCard = {
  login: string;
  name: string;
  personalBest: number;
  localRecord: number;
  device: string;
  camera: string;
};

class PlayerInfoPlugin {
  private readonly widget: Widget;
  private cards: Record<string, PlayerCard> = {};

  constructor(private readonly ctx: PluginContext<Config>) {
    this.widget = ctx.ui.widget({
      id: "player-info-widget",
      template: "widgets/player-info/player-info",
      position: { x: -156, y: -49 },
    });

    ctx.on("beginMap", () => this.refreshAll());
    ctx.on("playerConnect", (player) => this.onPlayerConnect(player));
    ctx.on("finish", (waypoint) => this.onFinish(waypoint));
  }

  async start() {
    this.widget.display();
    await this.refreshAll();
  }

  onConfigUpdate() {
    for (const card of Object.values(this.cards)) {
      Object.assign(card, this.setupFor(card.login));
    }
    this.render();
  }

  private setupFor(login: string): Pick<PlayerCard, "device" | "camera"> {
    const configured = this.ctx.config().playerInfos?.find((p) => p.login === login);
    return {
      device: configured?.device || "Unknown",
      camera: configured?.camera || "Unknown",
    };
  }

  private onFinish(waypoint: Waypoint) {
    const card = this.cards[waypoint.login];
    if (!card) return;

    let changed = false;
    if (!card.personalBest || waypoint.racetime < card.personalBest) {
      card.personalBest = waypoint.racetime;
      changed = true;
    }
    if (!card.localRecord || waypoint.racetime < card.localRecord) {
      card.localRecord = waypoint.racetime;
      changed = true;
    }
    if (changed) this.render();
  }

  private async onPlayerConnect(player: PlayerInfo) {
    if (this.cards[player.login]) return;

    const mapUid = this.ctx.live.activeMapUid;
    const [localRecords, personalBests] = mapUid
      ? await Promise.all([
          this.localRecords(mapUid, [player.login]),
          this.personalBests(mapUid, [player.login]),
        ])
      : [new Map<string, number>(), new Map<string, number>()];

    this.cards[player.login] = {
      login: player.login,
      name: player.nickName,
      localRecord: localRecords.get(player.login) ?? 0,
      personalBest: personalBests.get(player.login) ?? 0,
      ...this.setupFor(player.login),
    };
    this.render();
  }

  private async refreshAll() {
    const players = this.ctx.live.activePlayers.filter(
      (player) => !player.login.includes("fakeplayer"),
    );

    if (players.length === 0) {
      this.cards = {};
      this.render();
      return;
    }

    const map = await this.ctx.gbx.call<SMapInfo>("GetCurrentMapInfo");
    const logins = players.map((p) => p.login);
    const [localRecords, personalBests] = await Promise.all([
      this.localRecords(map.UId, logins),
      this.personalBests(map.UId, logins),
    ]);

    this.cards = {};
    for (const player of players) {
      this.cards[player.login] = {
        login: player.login,
        name: player.nickName,
        personalBest: personalBests.get(player.login) ?? 0,
        localRecord: localRecords.get(player.login) ?? 0,
        ...this.setupFor(player.login),
      };
    }
    this.render();
  }

  private async localRecords(mapUid: string, logins: string[]): Promise<Map<string, number>> {
    try {
      const records = await this.ctx.records.forPlayers(mapUid, logins);
      return new Map(records.filter((r) => r.login).map((r) => [r.login!, r.time]));
    } catch (error) {
      this.ctx.log.error("Failed to fetch player records", { error: String(error) });
      return new Map();
    }
  }

  // Keyed by login
  private async personalBests(mapUid: string, logins: string[]): Promise<Map<string, number>> {
    const accounts = logins
      .map((login) => [login, loginToAccountId(login)] as const)
      .filter((entry): entry is readonly [string, string] => entry[1] !== null);
    if (accounts.length === 0) return new Map();

    try {
      const byAccount = await this.ctx.nadeo.personalBests(
        mapUid,
        accounts.map(([, accountId]) => accountId),
      );
      return new Map(
        accounts
          .filter(([, accountId]) => accountId in byAccount)
          .map(([login, accountId]) => [login, byAccount[accountId]]),
      );
    } catch (error) {
      this.ctx.log.error("Failed to fetch personal bests", { error: String(error) });
      return new Map();
    }
  }

  private render() {
    this.widget.setData({ playerInfosJson: JSON.stringify(Object.values(this.cards)) });
    this.widget.update();
  }
}

export default definePlugin<Config>({
  create: (ctx) => new PlayerInfoPlugin(ctx),
});
