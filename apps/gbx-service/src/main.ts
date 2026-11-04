import * as Sentry from "@sentry/node";
import { fileURLToPath } from "node:url";
import pino from "pino";
import { loadConfig, type Config } from "./config";
import {
  createBase,
  createContainer,
  createMarketplace,
  type Base,
} from "./container";
import { ClusterGateway } from "./core/cluster/cluster-gateway";
import { LocalGateway, type ServerGateway } from "./core/cluster/gateway";
import { clusterKeys, type ControlMessage } from "./core/cluster/protocol";
import { runExclusive, SingletonJob } from "./core/cluster/singleton";
import { WorkerSupervisor } from "./core/cluster/supervisor";
import { AppError } from "./core/errors";
import type { MarketplaceWatcher } from "./core/plugins/marketplace-watcher";
import { systemClock } from "./core/ports";
import { buildApp } from "./http/app";
import { subscribeToLifecycleEvents } from "./infra/redis/lifecycle-subscriber";

// Flags withdrawn plugin versions before servers load their plugins, without holding up startup
async function checkMarketplace(
  marketplace: MarketplaceWatcher | null,
  base: Base,
) {
  if (!marketplace) return;
  await Promise.race([
    marketplace
      .check()
      .catch((error) =>
        base.log.warn({ err: error }, "Could not check the plugin marketplace"),
      ),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
}

// GBX_WORKERS=0: connections, HTTP and sockets all in this process, as before the cluster
async function startSingleProcess(config: Config) {
  const container = await createContainer(config);
  const { log, registry } = container;
  const gateway = new LocalGateway(registry, log);
  const marketplace = createMarketplace(
    config,
    container,
    async (install, reason) => {
      await registry
        .find(install.serverId)
        ?.disablePlugin(install.pluginId, install.name, reason);
    },
  );

  const unsubscribe = await subscribeToLifecycleEvents(
    container.subscriber,
    (event) => registry.handleLifecycleEvent(event),
    log,
  );
  // Registry packages move installs from before the marketplace onto packaged plugins
  await container.waitForSchema();
  await container.installFirstPartyPlugins();
  await checkMarketplace(marketplace, container);
  await registry.startAll();
  const app = await listen(config, container, gateway);
  marketplace?.start(false);

  return async () => {
    marketplace?.stop();
    await app.close();
    await unsubscribe().catch(() => undefined);
    await container.close();
  };
}

// The front serves HTTP and sockets and supervises the workers; it never opens a GBX connection
async function startFront(config: Config) {
  const base = createBase(config, "front");
  const { log, cluster } = base;
  const frontId = `${config.GBX_NODE_ID}:front.${Date.now().toString(36)}`;
  const gateway = new ClusterGateway({
    frontId,
    store: cluster,
    clock: systemClock,
    log,
  });
  await gateway.start();

  const marketplace = createMarketplace(
    config,
    base,
    async (install, reason) => {
      try {
        await gateway.call(install.serverId, "disablePlugin", {
          pluginId: install.pluginId,
          name: install.name,
          reason,
        });
      } catch (error) {
        // Not running anywhere: the server loads without the withdrawn version next time
        if (!(error instanceof AppError && error.code === "ServerUnavailable"))
          throw error;
      }
    },
  );

  // One node installs and checks; the others wait, so workers load plugins after it is done
  await base.waitForSchema();
  await runExclusive(
    cluster,
    "first-party",
    frontId,
    async () => {
      await base.installFirstPartyPlugins();
      await checkMarketplace(marketplace, base);
    },
    log,
  );

  const supervisor = new WorkerSupervisor({
    count: config.GBX_WORKERS,
    nodeId: config.GBX_NODE_ID,
    entry: workerEntry(),
    store: cluster,
    log: log.child({ module: "supervisor" }),
  });
  supervisor.start();
  // Restart requests go to every front; only the one running that worker acts on it
  const stopControl = await cluster.subscribe(clusterKeys.control, (raw) => {
    try {
      const message = JSON.parse(raw) as ControlMessage;
      if (message.action === "restartWorker")
        supervisor.restart(message.workerId);
    } catch {
      log.warn("Ignoring malformed cluster control message");
    }
  });

  const app = await listen(config, base, gateway);
  const marketplaceJob = marketplace
    ? new SingletonJob(
        cluster,
        "marketplace",
        frontId,
        {
          start: () => marketplace.start(false),
          stop: () => marketplace.stop(),
        },
        log,
      )
    : null;
  marketplaceJob?.start();
  log.info(
    { workers: config.GBX_WORKERS, nodeId: config.GBX_NODE_ID },
    "GBX front started",
  );

  return async () => {
    await app.close();
    await marketplaceJob?.stop();
    await stopControl().catch(() => undefined);
    await supervisor.stop();
    await gateway.stop();
    await base.close();
  };
}

async function listen(config: Config, base: Base, gateway: ServerGateway) {
  const app = await buildApp({
    gateway,
    log: base.log,
    serviceToken: config.GBX_SERVICE_TOKEN,
    tickets: base.tickets,
    allowedOrigins: config.WS_ALLOWED_ORIGINS,
  });
  await app.listen({ host: config.HOST, port: config.PORT });
  return app;
}

// worker.ts under tsx in development, the bundled worker.js in production
function workerEntry(): string {
  const ext = import.meta.url.endsWith(".ts") ? ".ts" : ".js";
  return fileURLToPath(new URL(`./worker${ext}`, import.meta.url));
}

async function main() {
  const config = loadConfig();

  if (config.SENTRY_DSN) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      environment: config.SENTRY_ENVIRONMENT ?? config.NODE_ENV,
    });
  }

  // Process-level messages go through pino too, so they land in the same JSON log stream
  const log = pino({ level: config.LOG_LEVEL }).child({ process: "main" });
  process.on("unhandledRejection", (reason) => {
    log.error({ err: reason }, "Unhandled promise rejection");
    Sentry.captureException(reason);
  });

  const stop =
    config.GBX_WORKERS === 0
      ? await startSingleProcess(config)
      : await startFront(config);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    log.info({ signal }, "Shutting down");
    await stop().catch((error) => log.error({ err: error }, "Shutdown failed"));
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
