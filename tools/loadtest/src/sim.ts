import type {
  Scores,
  ScriptMap,
  SMapInfo,
  SPlayerInfo,
} from "@tmcontrolpanel/shared";
import { accountId, rng } from "./util.js";

export interface SimOptions {
  index: number;
  players: number;
  // WayPoints per player per second
  eventRate: number;
  // Chat lines per second for the whole server
  chatRate: number;
  mapMinutes: number;
  seed: number;
}

export interface SimHooks {
  callback(name: string, params: unknown[]): void;
  // Sent as ManiaPlanet.ModeScriptCallbackArray [name, [json]]
  script(name: string, payload: object): void;
}

interface SimPlayer {
  info: SPlayerInfo;
  state: "idle" | "running";
  cd: number;
  elapsed: number;
  cps: number[];
  best: number;
  bestCps: number[];
  prev: number;
  prevCps: number[];
}

export const MAP_COUNT = 8;
// Waypoints per attempt, the last one is the finish
export const WAYPOINTS = 8;
const CHAT_LINES = [
  "gg",
  "nice run",
  "wr?",
  "lol",
  "rip",
  "gl hf",
  "so close",
  "restart",
];
const PODIUM_MS = 5000;

export function fakeMap(i: number, fileName?: string): SMapInfo {
  const author = 20000 + ((i * 3777) % 9000);
  return {
    UId: `lt-map-uid-${String(i).padStart(4, "0")}`.padEnd(27, "x"),
    Name: `Load Map ${i}`,
    FileName: fileName ?? `LoadTest\\lt-map-${i}.Map.Gbx`,
    Author: "lt-author",
    AuthorNickname: "Load Author",
    Environnement: "Stadium",
    Mood: "Day",
    BronzeTime: Math.round(author * 1.5),
    SilverTime: Math.round(author * 1.2),
    GoldTime: Math.round(author * 1.05),
    AuthorTime: author,
    CopperPrice: 1000 + i * 10,
    LapRace: false,
    NbLaps: 1,
    NbCheckpoints: WAYPOINTS - 1,
    MapType: "TrackMania\\TM_Race",
    MapStyle: "",
  };
}

export function toScriptMap(m: SMapInfo): ScriptMap {
  return {
    uid: m.UId,
    name: m.Name,
    filename: m.FileName,
    author: m.Author,
    authornickname: m.AuthorNickname,
    environment: m.Environnement,
    mood: m.Mood,
    bronzetime: m.BronzeTime,
    silvertime: m.SilverTime,
    goldtime: m.GoldTime,
    authortime: m.AuthorTime,
    copperprice: m.CopperPrice,
    laprace: m.LapRace,
    nblaps: m.NbLaps,
    maptype: m.MapType,
    mapstyle: m.MapStyle,
  };
}

// Simulated server world; advanced by tick() so tests can drive it deterministically
export class Simulation {
  maps: SMapInfo[] = Array.from({ length: MAP_COUNT }, (_, i) => fakeMap(i));
  mapIndex = 0;
  nextMapIndex = 1;
  scriptName = "TimeAttack.Script.txt";
  nextScriptName = "TimeAttack.Script.txt";
  paused = false;
  readonly players = new Map<string, SimPlayer>();
  private phase: "race" | "podium" = "race";
  private phaseLeft: number;
  private clock = 0;
  private nextId = 1;
  private joined = 0;
  private mapCount = 1;
  private readonly rand: () => number;
  private readonly mapMs: number;

  constructor(
    private readonly opts: SimOptions,
    private readonly hooks: SimHooks,
  ) {
    this.rand = rng(opts.seed * 7919 + opts.index);
    this.mapMs = Math.max(1000, opts.mapMinutes * 60_000);
    this.phaseLeft = this.mapMs;
    for (let i = 0; i < opts.players; i++) this.addPlayer(false);
  }

  get map(): SMapInfo {
    return this.maps[this.mapIndex];
  }

  playerList(): SPlayerInfo[] {
    return [...this.players.values()].map((p) => p.info);
  }

  private addPlayer(announce: boolean): void {
    const n = this.joined++;
    const login = `lt-${this.opts.index}-${n}`;
    const info: SPlayerInfo = {
      Login: login,
      NickName: `Bot ${this.opts.index}.${n}`,
      PlayerId: this.nextId++,
      SpectatorStatus: 0,
      TeamId: -1,
      LadderRanking: 1 + Math.floor(this.rand() * 50000),
      Flags: 101000,
    };
    this.players.set(login, {
      info,
      state: "idle",
      cd: this.rand() * 3000,
      elapsed: 0,
      cps: [],
      best: 0,
      bestCps: [],
      prev: 0,
      prevCps: [],
    });
    if (announce) {
      this.hooks.callback("ManiaPlanet.PlayerConnect", [login, false]);
      this.hooks.callback("ManiaPlanet.PlayerInfoChanged", [info]);
    }
  }

  removePlayer(login: string, reason = ""): boolean {
    if (!this.players.delete(login)) return false;
    this.hooks.callback("ManiaPlanet.PlayerDisconnect", [login, reason]);
    return true;
  }

  private interval(): number {
    return (
      (1000 / Math.max(0.01, this.opts.eventRate)) * (0.7 + 0.6 * this.rand())
    );
  }

  tick(dt: number): void {
    this.clock += dt;
    this.phaseLeft -= dt;
    if (this.phase === "podium") {
      if (this.phaseLeft <= 0) this.beginMap(this.nextMapIndex);
      return;
    }
    this.churn(dt);
    for (const p of [...this.players.values()]) this.advance(p, dt);
    if (
      this.rand() < (dt / 1000) * this.opts.chatRate &&
      this.players.size > 0
    ) {
      const all = [...this.players.values()];
      const p = all[Math.floor(this.rand() * all.length)];
      const text = CHAT_LINES[Math.floor(this.rand() * CHAT_LINES.length)];
      this.hooks.callback("ManiaPlanet.PlayerChat", [
        p.info.PlayerId,
        p.info.Login,
        text,
        false,
        0,
      ]);
    }
    if (this.phaseLeft <= 0 && !this.paused) this.endMap();
  }

  // One leave or join about every two seconds, keeping the count near the target
  private churn(dt: number): void {
    if (this.rand() >= dt / 2000) return;
    if (this.players.size >= this.opts.players) {
      const all = [...this.players.keys()];
      this.removePlayer(all[Math.floor(this.rand() * all.length)], "");
    } else this.addPlayer(true);
  }

  private base(p: SimPlayer) {
    return {
      time: this.clock,
      login: p.info.Login,
      accountid: accountId(p.info.Login),
    };
  }

  private advance(p: SimPlayer, dt: number): void {
    p.cd -= dt;
    if (p.cd > 0) return;
    if (p.state === "idle") {
      p.state = "running";
      p.elapsed = 0;
      p.cps = [];
      p.cd = this.interval();
      this.hooks.script("Trackmania.Event.StartLine", this.base(p));
      return;
    }
    if (this.rand() < 0.02) {
      p.state = "idle";
      p.cd = 1000 + this.rand() * 2000;
      this.hooks.script("Trackmania.Event.GiveUp", this.base(p));
      return;
    }
    const step = this.interval();
    p.elapsed += step;
    const racetime = Math.round(p.elapsed);
    p.cps.push(racetime);
    const index = p.cps.length - 1;
    const finish = p.cps.length >= WAYPOINTS;
    this.hooks.script("Trackmania.Event.WayPoint", {
      ...this.base(p),
      racetime,
      laptime: racetime,
      stuntsscore: 0,
      checkpointinrace: index,
      checkpointinlap: index,
      isendrace: finish,
      isendlap: finish,
      curracecheckpoints: [...p.cps],
      curlapcheckpoints: [...p.cps],
      blockid: `Block${index}`,
      speed: Math.round(150 + this.rand() * 250),
    });
    if (finish) {
      p.prev = racetime;
      p.prevCps = [...p.cps];
      if (p.best === 0 || racetime < p.best) {
        p.best = racetime;
        p.bestCps = [...p.cps];
      }
      p.state = "idle";
      p.cd = 1500 + this.rand() * 3000;
    } else p.cd = step;
  }

  scores(section: string, responseId = ""): Scores {
    const sorted = [...this.players.values()].sort(
      (a, b) => (a.best || Infinity) - (b.best || Infinity),
    );
    return {
      responseid: responseId,
      section,
      useteams: false,
      winnerteam: -1,
      winnerplayer: sorted[0]?.best ? sorted[0].info.Login : "",
      teams: [],
      players: sorted.map((p, i) => ({
        login: p.info.Login,
        accountid: accountId(p.info.Login),
        name: p.info.NickName,
        team: -1,
        rank: i + 1,
        roundpoints: 0,
        mappoints: 0,
        matchpoints: 0,
        bestracetime: p.best || -1,
        bestracecheckpoints: p.bestCps,
        bestlaptime: p.best || -1,
        bestlapcheckpoints: p.bestCps,
        prevracetime: p.prev || -1,
        prevracecheckpoints: p.prevCps,
      })),
    };
  }

  endMap(): void {
    this.hooks.script("Maniaplanet.EndMap_Start", {
      count: this.mapCount,
      time: this.clock,
      map: toScriptMap(this.map),
    });
    this.hooks.script("Maniaplanet.Podium_Start", { time: this.clock });
    this.hooks.script("Trackmania.Scores", this.scores("EndMap"));
    this.hooks.callback("ManiaPlanet.EndMap", [this.map]);
    this.phase = "podium";
    this.phaseLeft = Math.min(PODIUM_MS, this.mapMs / 4);
  }

  // Jump straight to a map, as JumpToMapIndex/RestartMap do
  changeMap(index: number): void {
    if (this.phase === "race") this.endMap();
    this.beginMap(index);
  }

  private beginMap(index: number): void {
    const wrapped = index >= this.maps.length || index <= 0;
    this.mapIndex =
      ((index % this.maps.length) + this.maps.length) % this.maps.length;
    this.nextMapIndex = (this.mapIndex + 1) % this.maps.length;
    this.scriptName = this.nextScriptName;
    this.mapCount++;
    this.phase = "race";
    this.phaseLeft = this.mapMs;
    for (const p of this.players.values()) {
      p.state = "idle";
      p.cd = this.rand() * 3000;
      p.best = p.prev = 0;
      p.bestCps = p.prevCps = [];
    }
    if (wrapped) this.hooks.callback("ManiaPlanet.BeginMatch", []);
    this.hooks.callback("ManiaPlanet.BeginMap", [this.map]);
    this.hooks.script("Maniaplanet.StartMap_Start", {
      count: this.mapCount,
      restarted: false,
      time: this.clock,
      map: toScriptMap(this.map),
    });
  }
}
