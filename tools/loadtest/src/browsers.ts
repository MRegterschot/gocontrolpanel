import {
  sessionClaimsSchema,
  signWsTicket,
  wsPaths,
  type SessionClaims,
} from "@tmcontrolpanel/shared";
import { readFile } from "node:fs/promises";
import WebSocket from "ws";
import { Args, Counter, percentile, round, sleep } from "./util.js";

export interface BrowsersConfig {
  browsers: number;
  url: string;
  origin?: string;
  claims: SessionClaims;
  secret: string;
  serverIds: string[];
  channels: string[];
  ramp: number;
  duration: number;
  httpUrl?: string;
  httpPaths: string[];
  httpRps: number;
  cookie?: string;
}

const ALL_CHANNELS = ["servers", "notifications", "live", "map", "players"];
const STATS_INTERVAL_S = 10;
const MAX_NOT_FOUND_RETRIES = 5;
const MAX_RETRY_DELAY_MS = 30_000;
const SAMPLE_CAP = 100_000;

export async function browsersConfig(a: Args): Promise<BrowsersConfig> {
  const claimsPath = a.str("claims");
  if (!claimsPath) throw new Error("--claims <file> is required");
  const secret = process.env.WS_TICKET_SECRET;
  if (!secret) throw new Error("WS_TICKET_SECRET is required");
  const claims = sessionClaimsSchema.parse(
    JSON.parse(await readFile(claimsPath, "utf8")),
  );
  const serversFile = a.str("servers-file");
  const serverIds: string[] = serversFile
    ? JSON.parse(await readFile(serversFile, "utf8"))
    : [];
  const channels = (a.str("channels") ?? ALL_CHANNELS.join(","))
    .split(",")
    .map((c) => c.trim());
  const bad = channels.filter((c) => !ALL_CHANNELS.includes(c));
  if (bad.length) throw new Error(`Unknown channels: ${bad.join(",")}`);
  if (
    serverIds.length === 0 &&
    channels.some((c) => ["live", "map", "players"].includes(c))
  )
    throw new Error(
      "--servers-file (JSON array of server ids) is required for live/map/players",
    );
  return {
    browsers: a.num("browsers", 1),
    url: (
      a.str("url") ??
      process.env.GBX_SERVICE_WS_URL ??
      "ws://localhost:3100"
    ).replace(/\/$/, ""),
    origin: a.str("origin"),
    claims,
    secret,
    serverIds,
    channels,
    ramp: a.num("ramp", 0),
    duration: a.num("duration", 60),
    httpUrl: a.str("http-url"),
    httpPaths: (a.str("http-paths") ?? "/api/health,/login")
      .split(",")
      .map((p) => p.trim()),
    httpRps: a.num("http-rps", 0),
    cookie: process.env.LOADTEST_COOKIE,
  };
}

// Records samples capped so long runs stay bounded
class Samples {
  all: number[] = [];
  window: number[] = [];
  add(v: number) {
    if (this.all.length < SAMPLE_CAP) this.all.push(v);
    if (this.window.length < SAMPLE_CAP) this.window.push(v);
  }
  static pct(values: number[]) {
    const s = [...values].sort((x, y) => x - y);
    return {
      p50: round(percentile(s, 0.5)),
      p95: round(percentile(s, 0.95)),
      p99: round(percentile(s, 0.99)),
    };
  }
}

export class BrowserMetrics {
  messages = 0;
  bytes = 0;
  opens = 0;
  reconnects = 0;
  windowMessages = 0;
  windowBytes = 0;
  closeCodes = new Counter();
  errors = new Counter();
  messageTypes = new Counter();
  interArrival = new Samples();
  http = {
    requests: 0,
    windowRequests: 0,
    status: new Counter(),
    errors: new Counter(),
    latency: new Samples(),
  };
}

function channelPath(channel: string, serverId: string): string {
  switch (channel) {
    case "servers":
      return wsPaths.servers;
    case "notifications":
      return wsPaths.notifications;
    case "live":
      return wsPaths.live(serverId);
    case "map":
      return wsPaths.map(serverId);
    default:
      return wsPaths.players(serverId);
  }
}

// One channel socket with the same reconnect rules as the web app's channel-socket
function openChannel(
  cfg: BrowsersConfig,
  metrics: BrowserMetrics,
  path: string,
  isStopped: () => boolean,
  track: (ws: WebSocket) => void,
): void {
  let attempt = 0;
  let notFound = 0;
  let everOpened = false;

  const connect = async () => {
    if (isStopped()) return;
    // Tickets are single use, so every connection mints its own
    const ticket = await signWsTicket(cfg.claims, cfg.secret);
    const ws = new WebSocket(
      `${cfg.url}${path}?ticket=${encodeURIComponent(ticket)}`,
      {
        origin: cfg.origin,
      },
    );
    track(ws);
    let last = 0;
    ws.on("open", () => {
      metrics.opens++;
      if (everOpened) metrics.reconnects++;
      everOpened = true;
    });
    ws.on("message", (data: Buffer) => {
      const now = performance.now();
      if (last) metrics.interArrival.add(now - last);
      last = now;
      metrics.messages++;
      metrics.windowMessages++;
      metrics.bytes += data.length;
      metrics.windowBytes += data.length;
      try {
        const type = JSON.parse(data.toString()).type;
        if (typeof type === "string") metrics.messageTypes.inc(type);
      } catch {
        metrics.errors.inc("bad-json");
      }
    });
    ws.on("error", (e: Error) =>
      metrics.errors.inc(e.message.replace(/\d{4,}/g, "N").slice(0, 80)),
    );
    ws.on("close", (code: number) => {
      metrics.closeCodes.inc(String(code));
      if (isStopped() || code === 4403) return;
      let delay = Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
      attempt++;
      if (code === 4001) {
        delay = 0;
        attempt = 0;
      } else if (code === 4404 && ++notFound > MAX_NOT_FOUND_RETRIES) return;
      setTimeout(
        () => void connect().catch(() => undefined),
        delay + Math.random() * 250,
      );
    });
  };
  void connect().catch((e) =>
    metrics.errors.inc(`connect: ${(e as Error).message.slice(0, 60)}`),
  );
}

function startHttp(
  cfg: BrowsersConfig,
  m: BrowserMetrics,
  isStopped: () => boolean,
): () => void {
  if (!cfg.httpUrl || cfg.httpRps <= 0) return () => undefined;
  const base = cfg.httpUrl.replace(/\/$/, "");
  const headers: Record<string, string> = cfg.cookie
    ? { cookie: cfg.cookie }
    : {};
  let inflight = 0;
  let credit = 0;
  let n = 0;
  const fire = async () => {
    const path = cfg.httpPaths[n++ % cfg.httpPaths.length];
    const t0 = performance.now();
    inflight++;
    try {
      const res = await fetch(base + path, { headers, redirect: "manual" });
      await res.arrayBuffer();
      m.http.status.inc(String(res.status));
    } catch (e) {
      m.http.errors.inc((e as Error).message.slice(0, 60));
    } finally {
      inflight--;
      m.http.requests++;
      m.http.windowRequests++;
      m.http.latency.add(performance.now() - t0);
    }
  };
  const timer = setInterval(() => {
    if (isStopped()) return;
    credit += cfg.httpRps * 0.1;
    while (credit >= 1) {
      credit--;
      if (inflight < 1000) void fire();
    }
  }, 100);
  return () => clearInterval(timer);
}

export async function runBrowsers(
  cfg: BrowsersConfig,
  stop: Promise<void>,
  out: (line: string) => void = console.log,
): Promise<object> {
  const m = new BrowserMetrics();
  const sockets = new Set<WebSocket>();
  let stopped = false;
  const isStopped = () => stopped;
  const started = Date.now();
  let windowStart = started;

  const startBrowser = (i: number) => {
    const serverId = cfg.serverIds.length
      ? cfg.serverIds[i % cfg.serverIds.length]
      : "";
    for (const channel of cfg.channels)
      openChannel(cfg, m, channelPath(channel, serverId), isStopped, (ws) => {
        sockets.add(ws);
        ws.once("close", () => sockets.delete(ws));
      });
  };
  const rampMs = cfg.ramp * 1000;
  const startTimers: NodeJS.Timeout[] = [];
  for (let i = 0; i < cfg.browsers; i++) {
    const at = cfg.browsers > 1 ? (i / (cfg.browsers - 1)) * rampMs : 0;
    startTimers.push(setTimeout(() => startBrowser(i), at));
  }
  const stopHttp = startHttp(cfg, m, isStopped);

  const snapshot = (type: "stats" | "summary", total: boolean) => {
    const now = Date.now();
    const secs = Math.max(
      0.001,
      (now - (total ? started : windowStart)) / 1000,
    );
    const messages = total ? m.messages : m.windowMessages;
    const bytes = total ? m.bytes : m.windowBytes;
    const body = {
      type,
      t: round((now - started) / 1000, 1),
      openSockets: [...sockets].filter((s) => s.readyState === WebSocket.OPEN)
        .length,
      messagesPerSec: round(messages / secs),
      bytesPerSec: round(bytes / secs),
      messages: m.messages,
      bytes: m.bytes,
      reconnects: m.reconnects,
      closeCodes: Object.fromEntries(m.closeCodes.entries()),
      errors: Object.fromEntries(m.errors.entries()),
      interArrivalMs: Samples.pct(
        total ? m.interArrival.all : m.interArrival.window,
      ),
      ...(type === "summary"
        ? { messageTypes: Object.fromEntries(m.messageTypes.entries()) }
        : {}),
      ...(cfg.httpUrl && cfg.httpRps > 0
        ? {
            http: {
              rps: round(
                (total ? m.http.requests : m.http.windowRequests) / secs,
              ),
              requests: m.http.requests,
              status: Object.fromEntries(m.http.status.entries()),
              errors: Object.fromEntries(m.http.errors.entries()),
              latencyMs: Samples.pct(
                total ? m.http.latency.all : m.http.latency.window,
              ),
            },
          }
        : {}),
    };
    if (!total) {
      windowStart = now;
      m.windowMessages = m.windowBytes = m.http.windowRequests = 0;
      m.interArrival.window = [];
      m.http.latency.window = [];
    }
    return body;
  };

  const timer = setInterval(
    () => out(JSON.stringify(snapshot("stats", false))),
    STATS_INTERVAL_S * 1000,
  );
  const limit =
    cfg.duration > 0
      ? sleep(cfg.duration * 1000)
      : new Promise<void>(() => undefined);
  await Promise.race([stop, limit]);
  stopped = true;
  clearInterval(timer);
  stopHttp();
  startTimers.forEach(clearTimeout);
  const summary = {
    ...snapshot("summary", true),
    durationSec: round((Date.now() - started) / 1000, 1),
  };
  for (const s of sockets) s.close(1000);
  out(JSON.stringify(summary));
  return summary;
}
