import * as Sentry from "@sentry/node";
import { loadConfig } from "./config";
import { createBase, createContainer } from "./container";
import { HEARTBEAT_MESSAGE } from "./core/cluster/supervisor";
import { WorkerNode } from "./core/cluster/worker-node";
import { systemClock } from "./core/ports";

// A worker process: holds the GBX connections, plugins and recording of the servers it owns.
// It has no port; the front reaches it through Redis.
async function main() {
  // Started first, so a long synchronous startup step is the only thing that can delay it
  const beat = setInterval(() => process.send?.(HEARTBEAT_MESSAGE), 2000);
  process.send?.(HEARTBEAT_MESSAGE);

  const config = loadConfig();
  const workerId = config.GBX_WORKER_ID;
  if (!workerId)
    throw new Error(
      "GBX_WORKER_ID is not set; workers are started by the front process",
    );

  if (config.SENTRY_DSN) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      environment: config.SENTRY_ENVIRONMENT ?? config.NODE_ENV,
    });
  }

  const base = createBase(config, `worker ${workerId}`);
  const container = await createContainer(config, base);
  const { log, registry } = container;

  process.on("unhandledRejection", (reason) => {
    log.error({ err: reason }, "Unhandled promise rejection");
    Sentry.captureException(reason);
  });

  const node = new WorkerNode({
    workerId,
    registry,
    store: container.cluster,
    listServers: () => container.servers.listActiveIds(),
    clock: systemClock,
    log: log.child({ module: "worker" }),
    ttlMs: config.GBX_LEASE_TTL_MS,
    info: {
      nodeId: config.GBX_NODE_ID,
      pid: process.pid,
      startedAt: Date.now(),
    },
  });
  await node.start();
  log.info({ workerId }, "GBX worker started");

  let stopping = false;
  const shutdown = async (reason: string) => {
    if (stopping) return;
    stopping = true;
    log.info({ reason }, "Worker shutting down");
    // Releases the leases only after the runtimes are gone, so the next owner never overlaps
    await node
      .stop()
      .catch((error) => log.error({ err: error }, "Worker stop failed"));
    clearInterval(beat);
    await container.close().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  // The front is gone; without it nobody restarts or supervises this process
  process.on("disconnect", () => void shutdown("front exited"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
