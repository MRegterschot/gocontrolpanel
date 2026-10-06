import * as Sentry from "@sentry/node";
import { loadConfig } from "./config";
import { createContainer } from "./container";
import { buildApp } from "./http/app";
import { subscribeToLifecycleEvents } from "./infra/redis/lifecycle-subscriber";

async function main() {
  const config = loadConfig();

  if (config.SENTRY_DSN) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      environment: config.SENTRY_ENVIRONMENT ?? config.NODE_ENV,
    });
  }

  const container = await createContainer(config);
  const { log, registry } = container;

  process.on("unhandledRejection", (reason) => {
    log.error({ err: reason }, "Unhandled promise rejection");
    Sentry.captureException(reason);
  });

  const app = await buildApp({
    registry,
    log,
    serviceToken: config.GBX_SERVICE_TOKEN,
    tickets: container.tickets,
    allowedOrigins: config.WS_ALLOWED_ORIGINS,
  });

  const unsubscribe = await subscribeToLifecycleEvents(
    container.subscriber,
    (event) => registry.handleLifecycleEvent(event),
    log,
  );

  // Registry packages move installs from before the marketplace onto packaged plugins
  await container.installFirstPartyPlugins();

  // Flag withdrawn plugin versions before the servers load their plugins, without holding up
  // startup for long when the marketplace can't be reached
  if (container.marketplace) {
    await Promise.race([
      container.marketplace
        .check()
        .catch((error) => log.warn({ err: error }, "Could not check the plugin marketplace")),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }

  await registry.startAll();
  await app.listen({ host: config.HOST, port: config.PORT });
  container.marketplace?.start(false);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    log.info({ signal }, "Shutting down");
    await app.close();
    await unsubscribe().catch(() => undefined);
    await container.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
