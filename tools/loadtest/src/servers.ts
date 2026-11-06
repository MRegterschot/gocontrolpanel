import { FakeServer } from "./fake-server.js";
import { ServerStats } from "./stats.js";
import { Args, Counter, round, sleep } from "./util.js";

const STATS_INTERVAL_S = 10;

export interface ServersConfig {
  count: number;
  basePort: number;
  host: string;
  password: string;
  players: number;
  eventRate: number;
  chatRate: number;
  mapMinutes: number;
  duration: number;
  seed: number;
  publicHost: string;
}

export function serversConfig(a: Args): ServersConfig {
  const cfg: ServersConfig = {
    count: a.num("count", 1),
    basePort: a.num("base-port", 5000),
    host: a.str("host") ?? "0.0.0.0",
    password: a.str("password") ?? "loadtest",
    players: a.num("players", 10),
    eventRate: a.num("event-rate", 0.5),
    chatRate: a.num("chat-rate", 0.1),
    mapMinutes: a.num("map-minutes", 5),
    duration: a.num("duration", 0),
    seed: a.num("seed", 1),
    publicHost: a.str("public-host") ?? "127.0.0.1",
  };
  if (cfg.count < 1 || cfg.basePort + cfg.count > 65536)
    throw new Error("--count/--base-port out of range");
  return cfg;
}

export function registrations(cfg: ServersConfig) {
  return Array.from({ length: cfg.count }, (_, i) => ({
    name: `Load Test ${i}`,
    host: cfg.publicHost,
    port: cfg.basePort + i,
    user: "SuperAdmin",
    password: cfg.password,
  }));
}

export async function runServers(
  cfg: ServersConfig,
  stop: Promise<void>,
  out: (line: string) => void = console.log,
): Promise<object> {
  const stats = new ServerStats();
  const servers = Array.from(
    { length: cfg.count },
    (_, i) =>
      new FakeServer({
        index: i,
        port: cfg.basePort + i,
        host: cfg.host,
        password: cfg.password,
        user: "SuperAdmin",
        players: cfg.players,
        eventRate: cfg.eventRate,
        chatRate: cfg.chatRate,
        mapMinutes: cfg.mapMinutes,
        seed: cfg.seed,
        stats,
      }),
  );
  await Promise.all(servers.map((s) => s.start()));
  out(
    JSON.stringify({
      type: "started",
      count: cfg.count,
      basePort: cfg.basePort,
    }),
  );

  const started = Date.now();
  let prev = { calls: new Map<string, number>(), cb: 0, at: started };
  const line = (type: "stats" | "summary") => {
    const now = Date.now();
    const secs = Math.max(0.001, (now - prev.at) / 1000);
    const delta = new Counter();
    for (const [k, v] of stats.requests.entries())
      delta.inc(k, v - (prev.calls.get(k) ?? 0));
    const body = {
      type,
      t: round((now - started) / 1000, 1),
      controllers: stats.controllers,
      requestsPerSec: round(
        delta.entries().reduce((n, [, v]) => n + v, 0) / secs,
      ),
      topMethodsPerSec: delta.top(10, secs),
      unknownMethods: Object.fromEntries(stats.unknown.entries()),
      callbacksPerSec: round((stats.totalCallbacks - prev.cb) / secs),
      chat: { count: stats.chatMessages, bytes: stats.chatBytes },
      manialinks: { count: stats.manialinkPages, bytes: stats.manialinkBytes },
    };
    prev = {
      calls: new Map(stats.requests.entries()),
      cb: stats.totalCallbacks,
      at: now,
    };
    return body;
  };

  const timer = setInterval(
    () => out(JSON.stringify(line("stats"))),
    STATS_INTERVAL_S * 1000,
  );
  const limit =
    cfg.duration > 0
      ? sleep(cfg.duration * 1000)
      : new Promise<void>(() => undefined);
  await Promise.race([stop, limit]);
  clearInterval(timer);

  prev = { calls: new Map(), cb: 0, at: started };
  const summary = {
    ...line("summary"),
    durationSec: round((Date.now() - started) / 1000, 1),
    totalRequests: stats.totalRequests,
    totalCallbacks: stats.totalCallbacks,
    requestsByMethod: Object.fromEntries(stats.requests.entries()),
  };
  await Promise.all(servers.map((s) => s.stop()));
  out(JSON.stringify(summary));
  return summary;
}
