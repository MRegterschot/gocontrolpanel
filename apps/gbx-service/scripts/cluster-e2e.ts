import { createPrismaClient } from "@tmcontrolpanel/db";
import {
  internalPaths,
  sessionClaimsSchema,
  signWsTicket,
  type ServerClient,
} from "@tmcontrolpanel/shared";
import { Redis } from "ioredis";
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import WebSocket from "ws";

const TIMEOUT = {
  startup: 60_000,
  crash: 10_000,
  hang: 30_000,
  shutdown: 20_000,
  takeover: 20_000,
  recovery: 30_000,
  lease: 15_000,
  request: 2_000,
  socket: 10_000,
  poll: 200,
  duplicate: 8_000,
  mapTransition: 45_000,
  standby: 10_000,
  outage: 20_000,
};
const ids = ["e2e-server", "e2e-server-2", "e2e-server-3"];
const startedAt = new Date();
const logDir = await mkdtemp(join(tmpdir(), "tmcp-cluster-e2e-"));
const db = createPrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URI!, {
  commandTimeout: TIMEOUT.request,
  maxRetriesPerRequest: 1,
});
redis.on("error", () => {});
type Log = {
  time: number;
  msg: string;
  pid: number;
  workerId?: string;
  serverId?: string;
  signal?: string;
};
type Front = {
  child: ChildProcess;
  port: number;
  logs: Log[];
  workers: Map<string, number>;
  exit?: { code: number | null; signal: string | null };
  error?: Error;
};
type Message = { type: string; data?: { serverId?: string } };
type Socket = {
  ws: WebSocket;
  messages: Message[];
  closes: { code: number; reason: string }[];
};
const fronts: Front[] = [];
const sockets: Socket[] = [];
let paused = false;
let failures = 0;
let cleaning: Promise<void> | undefined;

async function poll(
  label: string,
  timeout: number,
  predicate: () => Promise<boolean> | boolean,
) {
  const deadline = Date.now() + timeout;
  let last = "condition not met";
  do {
    try {
      if (await predicate()) return;
    } catch (error) {
      last = String(error);
    }
    await sleep(Math.min(TIMEOUT.poll, Math.max(0, deadline - Date.now())));
  } while (Date.now() < deadline);
  throw new Error(`${label}: timed out after ${timeout / 1000}s (${last})`);
}
async function check(name: string, run: () => Promise<void | string>) {
  const at = Date.now();
  try {
    const detail = await run();
    console.log(
      `PASS ${name} (${((Date.now() - at) / 1000).toFixed(2)}s)${detail ? `: ${detail}` : ""}`,
    );
  } catch (error) {
    failures++;
    console.log(
      `FAIL ${name} (${((Date.now() - at) / 1000).toFixed(2)}s): ${String(error).replace(/\s+/g, " ")}`,
    );
  }
}
function start(node: string, port: number, workers: number): Front {
  const child = spawn("npx", ["tsx", "src/main.ts"], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GBX_NODE_ID: node,
      PORT: String(port),
      GBX_WORKERS: String(workers),
      GBX_SERVICE_ENABLED_SERVERS: "",
      MARKETPLACE_CHECK_MINUTES: "0",
      LOG_LEVEL: "info",
      GBX_LEASE_TTL_MS: String(TIMEOUT.lease),
    },
  });
  const front: Front = { child, port, logs: [], workers: new Map() };
  fronts.push(front);
  const file = createWriteStream(join(logDir, `${node}.log`));
  let pending = "";
  child.stdout!.on("data", (chunk: Buffer) => {
    file.write(chunk);
    pending += chunk.toString();
    let newline: number;
    while ((newline = pending.indexOf("\n")) >= 0) {
      const line = pending.slice(0, newline);
      pending = pending.slice(newline + 1);
      try {
        const log = JSON.parse(line) as Log;
        front.logs.push(log);
        if (log.msg === "Started GBX worker" && log.workerId)
          front.workers.set(log.workerId, log.pid);
      } catch {
        /* Non-JSON startup output is retained in the log file. */
      }
    }
  });
  child.stderr!.on("data", (chunk: Buffer) => file.write(chunk));
  child.on("error", (error) => {
    front.error = error;
  });
  child.on("close", (code, signal) => {
    front.exit = { code, signal };
    file.end();
  });
  return front;
}
async function api<T>(front: Front, path: string, body?: unknown): Promise<T> {
  if (front.error) throw front.error;
  assert(!front.exit, `front on ${front.port} exited`);
  const response = await fetch(`http://127.0.0.1:${front.port}${path}`, {
    method: body ? "POST" : "GET",
    signal: AbortSignal.timeout(TIMEOUT.request),
    headers: {
      authorization: `Bearer ${process.env.GBX_SERVICE_TOKEN}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert(response.ok, `${path}: HTTP ${response.status}`);
  return ((await response.json()) as { data: T }).data;
}
async function connected(front: Front) {
  const rows = await api<ServerClient[]>(front, internalPaths.servers);
  return ids.every((id) =>
    rows.some((row) => row.serverId === id && row.isConnected),
  );
}
async function owners() {
  return redis.mget(ids.map((id) => `gbx:lease:${id}`));
}
async function worker(front: Front, id: string) {
  const owner = await redis.get(`gbx:lease:${id}`);
  assert(owner, `no lease for ${id}`);
  const pid = front.workers.get(owner);
  assert(pid, `no Started GBX worker log for ${owner}`);
  return { owner, pid };
}
async function openSocket(front: Front, path: string): Promise<Socket> {
  const claims = sessionClaimsSchema.parse({
    id: "cluster-e2e-admin",
    admin: true,
    servers: ids.map((id) => ({ id, name: id, role: "Admin" })),
    groups: [
      {
        id: "cluster-e2e",
        name: "Cluster e2e",
        role: "Admin",
        servers: ids.map((id) => ({ id, name: id })),
      },
    ],
  });
  const ticket = await signWsTicket(claims, process.env.WS_TICKET_SECRET!);
  const socket: Socket = {
    ws: new WebSocket(`ws://127.0.0.1:${front.port}${path}?ticket=${ticket}`),
    messages: [],
    closes: [],
  };
  sockets.push(socket);
  socket.ws.on("message", (raw) => {
    socket.messages.push(JSON.parse(raw.toString()) as Message);
  });
  socket.ws.on("close", (code, reason) =>
    socket.closes.push({ code, reason: reason.toString() }),
  );
  socket.ws.on("error", () => {});
  await poll(`socket ${path}`, TIMEOUT.socket, () => {
    assert.equal(socket.closes.length, 0, JSON.stringify(socket.closes));
    return socket.messages.length > 0;
  });
  return socket;
}
async function duplicates(front: Front, label: string) {
  await check(`${label}: exactly one match per NextMap`, async () => {
    // Compare IDs as well as timestamps because database timestamps may have only second precision.
    const before = await Promise.all(
      ids.map((serverId) =>
        db.matches.findMany({ where: { serverId }, select: { id: true } }),
      ),
    );
    const calls = await Promise.all(
      ids.map(async (id) => {
        const at = new Date();
        await api(front, internalPaths.gbxCall(id), {
          method: "NextMap",
          params: [],
        });
        return at;
      }),
    );
    const countNew = () =>
      Promise.all(
        ids.map((serverId, index) =>
          db.matches.count({
            where: {
              serverId,
              id: { notIn: before[index]!.map((row) => row.id) },
              createdAt: {
                gte: new Date(
                  Math.floor(calls[index]!.getTime() / 1000) * 1000,
                ),
              },
            },
          }),
        ),
      );
    // NextMap may spend longer than eight seconds in the dedicated server's podium transition.
    await poll("NextMap begin-match rows", TIMEOUT.mapTransition, async () =>
      (await countNew()).every((count) => count >= 1),
    );
    await sleep(TIMEOUT.duplicate);
    const counts = await countNew();
    assert.deepEqual(
      counts,
      [1, 1, 1],
      `new matches by server: ${counts.join(", ")}`,
    );
  });
}
async function stop(front: Front) {
  if (!front.exit) {
    const pid =
      front.logs.find((log) => log.msg === "GBX front started")?.pid ??
      front.logs.find((log) => log.msg.includes("Server listening"))?.pid;
    assert(pid, "front PID missing from logs");
    process.kill(pid, "SIGTERM");
    await poll(
      `front ${front.port} clean exit`,
      TIMEOUT.shutdown,
      () => !!front.exit,
    );
  }
  assert.equal(front.exit?.code, 0, `front exit ${JSON.stringify(front.exit)}`);
}
function docker(action: "pause" | "unpause") {
  execFileSync("docker", [action, "tmcp-e2e-redis-1"], {
    stdio: "pipe",
    timeout: TIMEOUT.request * 5,
  });
}
async function cleanup() {
  return (cleaning ??= (async () => {
    if (paused) {
      docker("unpause");
      paused = false;
    }
    for (const socket of sockets) socket.ws.terminate();
    // Each front has a private process group, including npx, tsx and all worker descendants.
    for (const front of fronts) {
      if (front.child.pid) {
        try {
          process.kill(-front.child.pid, "SIGKILL");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
        }
      }
    }
    redis.disconnect();
    await db.$disconnect();
  })());
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void cleanup().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  });
}
process.once("exit", () => {
  if (paused) {
    try {
      docker("unpause");
    } catch {}
  }
  for (const front of fronts)
    if (front.child.pid) {
      try {
        process.kill(-front.child.pid, "SIGKILL");
      } catch {}
    }
});

async function main() {
  console.log(`Started ${startedAt.toISOString()}; logs: ${logDir}`);
  assert.equal(
    new URL(process.env.REDIS_URI!).port,
    "56380",
    "requires isolated e2e Redis on port 56380",
  );
  assert.equal(
    new URL(process.env.DATABASE_URL!).port,
    "53307",
    "requires isolated e2e database on port 53307",
  );
  for (const port of [3101, 3102, 3103]) {
    const { createServer } = await import("node:net");
    await new Promise<void>((resolve, reject) => {
      const probe = createServer();
      probe.once("error", reject);
      probe.listen(port, "0.0.0.0", () =>
        probe.close((error) => (error ? reject(error) : resolve())),
      );
    });
  }
  let cursor = "0";
  do {
    const result = await redis.scan(cursor, "MATCH", "gbx:*", "COUNT", 100);
    cursor = result[0];
    if (result[1].length) await redis.del(...result[1]);
  } while (cursor !== "0");
  const a = start("node-a", 3101, 3);
  await check("a: three connected servers, one lease per worker", async () => {
    await poll("A startup and fair share", TIMEOUT.startup, async () => {
      const leases = await owners();
      return (
        (await connected(a)) &&
        leases.every((owner) => owner?.startsWith("node-a:")) &&
        new Set(leases).size === 3
      );
    });
  });
  const live = new Map<string, Socket>();
  let global: Socket | undefined;
  await check("b: live and servers sockets", async () => {
    for (const id of ids) live.set(id, await openSocket(a, `/ws/live/${id}`));
    global = await openSocket(a, "/ws/servers");
    const initial = global.messages.find(
      (m) => m.type === "servers",
    ) as unknown as { data: { id: string }[] };
    assert.deepEqual(initial.data.map((s) => s.id).sort(), [...ids].sort());
  });
  await duplicates(a, "c");
  await check("d: crash takeover, unaffected leases and sockets", async () => {
    const before = await owners();
    const target = await worker(a, ids[1]!);
    const socket = live.get(ids[1]!)!;
    assert(socket && global, "scenario b sockets required");
    const messageIndex = socket.messages.length,
      globalIndex = global.messages.length;
    process.kill(target.pid, "SIGKILL");
    await poll("crash takeover", TIMEOUT.crash, async () => {
      const leases = await owners();
      for (const index of [0, 2])
        assert.equal(leases[index], before[index], "unaffected lease changed");
      return !!leases[1] && leases[1] !== target.owner && (await connected(a));
    });
    await poll("new beginMatch after crash", TIMEOUT.socket, () =>
      socket.messages.slice(messageIndex).some((m) => m.type === "beginMatch"),
    );
    assert.equal(
      socket.ws.readyState,
      WebSocket.OPEN,
      `live socket closes: ${JSON.stringify(socket.closes)}`,
    );
    assert.equal(socket.closes.length, 0);
    assert(
      !global.messages
        .slice(globalIndex)
        .some(
          (m) =>
            m.type === "disconnect" &&
            [ids[0], ids[2]].some((id) => id === m.data?.serverId),
        ),
      "unaffected server disconnected",
    );
    const after = await owners();
    for (const index of [0, 2]) assert.equal(after[index], before[index]);
  });
  await duplicates(a, "d");
  await check("e: hung worker killed and replaced", async () => {
    const target = await worker(a, ids[2]!);
    const at = Date.now();
    process.kill(target.pid, "SIGSTOP");
    await poll("hang takeover", TIMEOUT.hang, async () => {
      const owner = await redis.get(`gbx:lease:${ids[2]}`);
      return (
        a.logs.some(
          (l) =>
            l.time >= at &&
            l.workerId === target.owner &&
            l.msg.includes("stopped responding"),
        ) &&
        a.logs.some(
          (l) =>
            l.time >= at &&
            l.workerId === target.owner &&
            l.msg === "GBX worker exited" &&
            l.signal === "SIGKILL",
        ) &&
        !!owner &&
        owner !== target.owner &&
        (await connected(a))
      );
    });
  });
  await duplicates(a, "e");
  // Let recovery's scheduled rebalance finish before measuring whether a standby disturbs ownership.
  await check("e: A returns to one server per worker", () =>
    poll("post-hang fair share", TIMEOUT.startup, async () => {
      const leases = await owners();
      return (
        leases.every((owner) => owner?.startsWith("node-a:")) &&
        new Set(leases).size === 3 &&
        (await connected(a))
      );
    }),
  );
  const standbyOwners = await owners();
  const b = start("node-b", 3102, 2);
  await check("f: standby does not steal leases", async () => {
    const before = standbyOwners;
    const deadline = Date.now() + TIMEOUT.standby;
    while (Date.now() < deadline) {
      assert.deepEqual(await owners(), before);
      assert(before.every((owner) => owner?.startsWith("node-a:")));
      await sleep(TIMEOUT.poll);
    }
  });
  await check("f: A exits cleanly", () => stop(a));
  await check("f: B takes all leases", async () => {
    await poll(
      "B takeover",
      TIMEOUT.takeover,
      async () =>
        (await connected(b)) &&
        (await owners()).every((owner) => owner?.startsWith("node-b:")),
    );
  });
  await duplicates(b, "f");
  await check("g: Redis outage fences every runtime within TTL", async () => {
    const at = Date.now();
    paused = true;
    docker("pause");
    try {
      await sleep(TIMEOUT.outage);
      const lost = b.logs.filter(
        (l) =>
          l.time >= at &&
          l.time <= at + TIMEOUT.lease &&
          l.msg.includes("Lost server lease"),
      );
      assert(
        ids.every((id) => lost.some((l) => l.serverId === id)),
        `lease-loss logs within TTL: ${JSON.stringify(lost)}`,
      );
      return `all runtimes fenced in ${((Math.max(...lost.map((l) => l.time)) - at) / 1000).toFixed(2)}s`;
    } finally {
      docker("unpause");
      paused = false;
    }
  });
  await check("g: reconnect after Redis resumes", async () => {
    await poll(
      "Redis recovery",
      TIMEOUT.recovery,
      async () =>
        (await connected(b)) &&
        (await owners()).every((owner) => owner?.startsWith("node-b:")),
    );
  });
  await duplicates(b, "g");
  await check("h: B exits cleanly", () => stop(b));
  const single = start("single", 3103, 0);
  await check("h: single-process connects all servers", () =>
    poll("single-process startup", TIMEOUT.startup, () => connected(single)),
  );
  await check("h: single-process exits cleanly", () => stop(single));
}
try {
  await main();
} catch (error) {
  failures++;
  console.log(
    `FAIL setup/scenario execution: ${String(error).replace(/\s+/g, " ")}`,
  );
} finally {
  await cleanup();
}
process.exitCode = failures ? 1 : 0;
