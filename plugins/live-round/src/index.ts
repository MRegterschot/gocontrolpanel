import {
  definePlugin,
  getSpectatorStatus,
  getTeamColors,
  loginToAccountId,
  throttle,
  type LiveInfo,
  type MainServerPlayerInfo,
  type PlayerInfo,
  type PlayerRound,
  type PluginContext,
  type Scores,
  type SMapInfo,
  type SPlayerInfo,
  type TeamColors,
  type Waypoint,
  type WaypointEvent,
  type Widget,
} from "@tmcontrolpanel/plugin-sdk";

interface Config {
  localRecordText?: string;
  showPoints?: boolean;
  rowCount?: number;
}

export type RoundEntry = {
  login: string;
  name: string;
  rank: number;
  points: number;
  checkpoints: number[];
  // 0 = not started, -1 = gave up
  time: number;
  team: TeamColors;
};

type Finish = {
  login: string;
  points: number;
  isPersonalBest: boolean;
  isLocalRecord: boolean;
  isWorldRecord: boolean;
};

// Most checkpoints first, then fastest, then fastest on the latest differing checkpoint
export function sortRoundEntries(entries: RoundEntry[]): RoundEntry[] {
  return [...entries].sort((a, b) => {
    if (b.checkpoints.length !== a.checkpoints.length) {
      return b.checkpoints.length - a.checkpoints.length;
    }
    if (a.time !== b.time) return a.time - b.time;
    for (let i = a.checkpoints.length; i >= 0; i--) {
      if (a.checkpoints[i] !== b.checkpoints[i]) return a.checkpoints[i] - b.checkpoints[i];
    }
    return 0;
  });
}

class LiveRoundPlugin {
  private readonly widget: Widget;
  private liveFastestTime: number | null = null;
  private rounds: RoundEntry[] = [];
  private finishes: Finish[] = [];
  // Badges are decided when a finish happens; renders are throttled and run after the record moved
  private readonly recordSetters = { local: new Set<string>(), world: new Set<string>() };
  private pointsLimit = -1;
  private pointsRepartition: number[] = [];
  private worldRecord = 0;
  private localRecord = 0;
  // Personal best per login
  private personalBests: Record<string, number> = {};

  private readonly render: () => void;

  constructor(private readonly ctx: PluginContext<Config>) {
    this.widget = ctx.ui.widget({
      id: "live-round-widget",
      template: "widgets/live-round/live-round",
      position: { x: -156, y: 73.5 },
    });
    this.render = throttle(ctx, () => this.send(), 100);

    ctx.on("beginMap", () => this.onBeginMap());
    ctx.on("beginMatch", () => this.reset());
    ctx.on("startRound", () => this.reset());
    ctx.on("playerConnect", (player) => this.onPlayerConnect(player));
    ctx.on("playerInfo", (player) => this.onPlayerInfo(player));
    ctx.on("playerDisconnect", (login) => this.onPlayerDisconnect(login));
    ctx.on("checkpoint", (waypoint) => this.onCheckpoint(waypoint));
    ctx.on("finish", (waypoint) => this.onFinish(waypoint));
    ctx.on("giveUp", (event) => this.onGiveUp(event));
    ctx.on("updatedSettings", (info) => this.onUpdatedSettings(info));
    ctx.on("scores", (scores) => this.onScores(scores));
    ctx.on("playerUpdated", (round) => this.onPlayerUpdated(round));
  }

  async start() {
    this.widget.display();
    await this.reset();
    await this.refreshRecords();
  }

  private newEntry(
    login: string,
    name: string,
    teamId: number,
    teams: LiveInfo["teams"] = this.ctx.live.liveInfo.teams,
  ): RoundEntry {
    return {
      login,
      name,
      rank: 0,
      time: 0,
      checkpoints: [],
      points: 0,
      team: getTeamColors(teams?.[teamId]?.name),
    };
  }

  private isOut(login: string, spectatorStatus: number): boolean {
    const status = this.ctx.live.reverseCupGetPlayerStatus(login);
    return (
      getSpectatorStatus(spectatorStatus).spectator || status.spectator || status.eliminated
    );
  }

  private async onPlayerConnect(player: PlayerInfo) {
    const map = await this.ctx.gbx.call<SMapInfo>("GetCurrentMapInfo");
    const accountId = loginToAccountId(player.login);
    try {
      const bests = accountId
        ? await this.ctx.nadeo.personalBests(map.UId, [accountId])
        : {};
      this.personalBests[player.login] = (accountId && bests[accountId]) || 0;
    } catch (error) {
      this.ctx.log.error("Failed to fetch personal best on connect", { error: String(error) });
      this.personalBests[player.login] ??= 0;
    }

    if (this.isOut(player.login, player.spectatorStatus)) return;
    if (this.rounds.some((r) => r.login === player.login)) return;

    this.rounds.push(this.newEntry(player.login, player.nickName, player.teamId));
    this.render();
  }

  private onPlayerDisconnect(login: string) {
    if (!this.rounds.some((r) => r.login === login)) return;
    this.rounds = this.rounds.filter((r) => r.login !== login);
    this.render();
  }

  private onPlayerInfo(player: PlayerInfo) {
    const round = this.rounds.find((r) => r.login === player.login);

    if (this.isOut(player.login, player.spectatorStatus)) {
      if (!round) return;
      this.rounds = this.rounds.filter((r) => r.login !== player.login);
    } else if (!round) {
      this.rounds.push(this.newEntry(player.login, player.nickName, player.teamId));
    } else {
      Object.assign(round, {
        ...this.newEntry(player.login, player.nickName, player.teamId),
        points: round.points,
      });
    }

    this.render();
  }

  private onPlayerUpdated(playerRound: PlayerRound) {
    const round = this.rounds.find((r) => r.login === playerRound.login);
    if (!round) return;
    round.points = playerRound.matchPoints;
    this.render();
  }

  private async onBeginMap() {
    this.liveFastestTime = null;
    await this.reset();
    await this.refreshRecords();
  }

  private onUpdatedSettings(info: LiveInfo) {
    this.pointsLimit = info.pointsLimit || -1;
    this.pointsRepartition = info.pointsRepartition || [];
    this.render();
  }

  private onCheckpoint(waypoint: Waypoint) {
    if (this.ctx.live.liveInfo.isWarmUp) return;
    const round = this.rounds.find((r) => r.login === waypoint.login);
    if (!round) return;

    round.time = waypoint.racetime;
    round.checkpoints = waypoint.curracecheckpoints;
    this.render();
  }

  private onFinish(waypoint: Waypoint) {
    if (this.ctx.live.liveInfo.isWarmUp || waypoint.racetime === 0) return;

    let isFastest = false;
    if (this.liveFastestTime === null || waypoint.racetime < this.liveFastestTime) {
      this.liveFastestTime = waypoint.racetime;
      isFastest = true;
    }

    const round = this.rounds.find((r) => r.login === waypoint.login);
    if (!round) return;

    round.time = waypoint.racetime;
    round.checkpoints = waypoint.curracecheckpoints;

    const personalBest = this.personalBests[waypoint.login] ?? 0;
    const isLocalRecord = isFastest && this.beatsLocalRecord(waypoint.racetime);
    const isWorldRecord = isFastest && this.beatsWorldRecord(waypoint.racetime);
    this.finishes.push({
      login: waypoint.login,
      points: 0,
      isPersonalBest: personalBest > 0 && waypoint.racetime < personalBest,
      isLocalRecord,
      isWorldRecord,
    });

    if (personalBest === 0 || waypoint.racetime < personalBest) {
      this.personalBests[waypoint.login] = waypoint.racetime;
    }
    if (isLocalRecord) {
      this.localRecord = waypoint.racetime;
      this.recordSetters.local.add(waypoint.login);
    }
    if (isWorldRecord) {
      this.worldRecord = waypoint.racetime;
      this.recordSetters.world.add(waypoint.login);
    }

    this.render();
  }

  private onGiveUp(event: WaypointEvent) {
    if (this.ctx.live.liveInfo.isWarmUp) return;
    const round = this.rounds.find((r) => r.login === event.login);
    if (!round) return;
    round.time = -1;
    this.render();
  }

  private onScores(scores: Scores) {
    if (scores.responseid !== this.ctx.pluginId && scores.section !== "EndRound") return;
    const { liveInfo } = this.ctx.live;

    for (const player of scores.players) {
      const round = this.rounds.find((r) => r.login === player.login);
      if (!round) continue;

      // Finalists past the limit have won and leave the board (not in teams mode)
      if (
        player.matchpoints > this.pointsLimit &&
        this.pointsLimit > 0 &&
        liveInfo.type !== "teams"
      ) {
        this.rounds = this.rounds.filter((r) => r.login !== player.login);
      } else {
        round.points = player.matchpoints;
      }
    }

    if (liveInfo.type === "reversecup") {
      this.rounds = this.rounds.filter((r) => r.points > -2000);
    }

    this.render();
  }

  private async refreshRecords() {
    const map = await this.ctx.gbx.call<SMapInfo>("GetCurrentMapInfo");
    const logins = this.ctx.live.activePlayers
      .map((p) => p.login)
      .filter((login) => !login.includes("fakeplayer"));

    if (!map) {
      this.worldRecord = 0;
      this.localRecord = 0;
      this.personalBests = Object.fromEntries(logins.map((login) => [login, 0]));
      return;
    }

    const local = await this.ctx.records.local(map.UId);
    this.localRecord = local ? local.time : 0;

    try {
      this.worldRecord = (await this.ctx.nadeo.worldRecord(map.UId))?.score ?? 0;
    } catch (error) {
      this.ctx.log.error("Failed to fetch world record", { error: String(error) });
      this.worldRecord = 0;
    }

    try {
      const accounts = logins
        .map((login) => [login, loginToAccountId(login)] as const)
        .filter((entry): entry is readonly [string, string] => entry[1] !== null);
      const bests = await this.ctx.nadeo.personalBests(
        map.UId,
        accounts.map(([, accountId]) => accountId),
      );
      for (const [login, accountId] of accounts) {
        this.personalBests[login] = bests[accountId] ?? 0;
      }
    } catch (error) {
      this.ctx.log.error("Failed to fetch personal bests", { error: String(error) });
      for (const login of logins) this.personalBests[login] ??= 0;
    }
  }

  private async reset() {
    const { liveInfo } = this.ctx.live;
    this.pointsLimit = liveInfo.pointsLimit || -1;
    this.pointsRepartition = liveInfo.pointsRepartition || [];
    this.finishes = [];
    this.recordSetters.local.clear();
    this.recordSetters.world.clear();
    this.rounds = [];

    const playerList = await this.ctx.gbx.call<SPlayerInfo[]>("GetPlayerList", 1000, 0);
    const mainServer = await this.ctx.gbx.call<MainServerPlayerInfo>("GetMainServerPlayerInfo");

    for (const player of Array.isArray(playerList) ? playerList : []) {
      if (!player.Login || player.Login === mainServer?.Login) continue;
      if (this.isOut(player.Login, player.SpectatorStatus)) continue;
      this.rounds.push(this.newEntry(player.Login, player.NickName, player.TeamId, liveInfo.teams));
    }

    await this.ctx.gbx.callScript("Trackmania.GetScores", this.ctx.pluginId);
  }

  private send() {
    const { live } = this.ctx;
    const config = this.ctx.config();

    this.rounds = sortRoundEntries(this.rounds);
    this.rounds.forEach((round, index) => (round.rank = index + 1));

    const rankOf = (login: string) => this.rounds.find((r) => r.login === login)?.rank;
    this.finishes.sort((a, b) => (rankOf(a.login) ?? 0) - (rankOf(b.login) ?? 0));

    this.finishes.forEach((finish, index) => {
      if (config?.showPoints === false) {
        finish.points = 0;
        return;
      }
      if (!rankOf(finish.login)) return;

      if (live.isReverseCup) {
        const playerCount = this.rounds.filter((r) => r.points > -2000).length;
        const repartition = live.reverseCupGetPointsRepartition(playerCount);
        finish.points = -repartition[Math.min(index, repartition.length - 1)] || 0;
      } else {
        const position = Math.min(index, this.pointsRepartition.length - 1);
        finish.points = this.pointsRepartition[position] || 0;
      }
    });

    // Only the leading finish can hold a record badge
    this.finishes.forEach((finish, index) => {
      finish.isLocalRecord = index === 0 && this.recordSetters.local.has(finish.login);
      finish.isWorldRecord = index === 0 && this.recordSetters.world.has(finish.login);
    });

    this.widget.setData({
      roundsJson: JSON.stringify(this.rounds),
      finishesJson: JSON.stringify(this.finishes),
      mode: live.liveInfo.type,
      pointsLimit: this.pointsLimit,
      localRecordText: config?.localRecordText || "LR",
      rowCount: config?.rowCount || 8,
    });
    this.widget.update();
  }

  private beatsLocalRecord(time: number): boolean {
    return this.localRecord === 0 || time < this.localRecord;
  }

  private beatsWorldRecord(time: number): boolean {
    return time < this.worldRecord;
  }
}

export default definePlugin<Config>({
  create: (ctx) => new LiveRoundPlugin(ctx),
});
