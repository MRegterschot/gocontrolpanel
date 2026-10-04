import { createPrismaClient } from "@gcp/db";
import pino from "pino";
import type { Config } from "./config";
import { TemplateRenderer } from "./core/manialink/template-renderer";
import { installFirstPartyPlugins } from "./core/plugins/first-party";
import { MarketplaceWatcher } from "./core/plugins/marketplace-watcher";
import { PackageLoader } from "./core/plugins/sandbox/package-loader";
import { systemClock } from "./core/ports";
import { ServerRegistry } from "./core/server/server-registry";
import { ServerRuntime, type RuntimeDependencies } from "./core/server/server-runtime";
import {
  PrismaMapRepository,
  PrismaFirstPartyRepository,
  PrismaMatchRepository,
  PrismaNotificationRepository,
  PrismaPlayerRepository,
  PrismaPluginCatalogRepository,
  PrismaPluginPackageRepository,
  PrismaPluginStorageRepository,
  PrismaRecordRepository,
  PrismaServerRepository,
} from "./infra/db/prisma-repositories";
import { EvotmGbxSession } from "./infra/gbx/evotm-session";
import { loadFirstPartyPackages } from "./infra/first-party-packages";
import { HttpsPluginClient } from "./infra/http/plugin-http-client";
import { HttpMarketplaceIndexSource } from "./infra/marketplace/index-source";
import { NadeoClient } from "./infra/nadeo/nadeo-client";
import { RedisCache } from "./infra/redis/cache";
import { RedisJukeboxStore } from "./infra/redis/jukebox-store";
import { RedisRateLimiter } from "./infra/redis/rate-limiter";
import { createRedis } from "./infra/redis/redis";
import { loadSandboxAssets } from "./infra/sandbox-assets";
import { loadTemplateSources } from "./infra/templates";
import { TicketVerifier } from "./http/ws/ticket-verifier";

// Composition root: the only place that picks concrete implementations
export async function createContainer(config: Config) {
  const log = pino({ level: config.LOG_LEVEL });
  const db = createPrismaClient({ datasourceUrl: config.DATABASE_URL });
  const redis = createRedis(config.REDIS_URI, log, "commands");
  // Subscriber connections cannot run normal commands
  const subscriber = createRedis(config.REDIS_URI, log, "subscriber");

  const players = new PrismaPlayerRepository(db);
  const servers = new PrismaServerRepository(db);
  const rateLimiter = new RedisRateLimiter(redis);
  const nadeo = new NadeoClient({
    config: {
      serverLogin: config.NADEO_SERVER_LOGIN,
      serverPassword: config.NADEO_SERVER_PASSWORD,
      contact: config.NADEO_CONTACT,
      clientId: config.NADEO_CLIENT_ID,
      clientSecret: config.NADEO_CLIENT_SECRET,
    },
    cache: new RedisCache(redis),
    rateLimit: (key, fn) => rateLimiter.run(key, fn),
    log: log.child({ module: "nadeo" }),
  });

  // Marketplace and uploaded plugins run in QuickJS sandboxes
  const packages = new PackageLoader(new PrismaPluginPackageRepository(db), {
    assets: await loadSandboxAssets(config.templatesDir),
    storage: new PrismaPluginStorageRepository(db),
    http: new HttpsPluginClient(),
    clock: systemClock,
  });

  const runtimeDeps: RuntimeDependencies = {
    log,
    clock: systemClock,
    sessionFactory: () => new EvotmGbxSession(log.child({ module: "gbx" })),
    renderer: new TemplateRenderer(loadTemplateSources(config.templatesDir)),
    // Every plugin is a package now; first-party ones are installed on start
    plugins: [],
    packages,
    servers,
    players,
    users: players,
    maps: new PrismaMapRepository(db),
    matches: new PrismaMatchRepository(db),
    records: new PrismaRecordRepository(db),
    notifications: new PrismaNotificationRepository(db),
    jukebox: new RedisJukeboxStore(redis),
    mapMetadata: nadeo,
    nadeo,
  };

  const registry = new ServerRegistry({
    servers,
    createRuntime: (serverId) => new ServerRuntime(serverId, runtimeDeps),
    log: log.child({ module: "registry" }),
    enabledServerIds: config.GBX_SERVICE_ENABLED_SERVERS,
  });

  const marketplace =
    config.MARKETPLACE_INDEX_URL && config.MARKETPLACE_CHECK_MINUTES > 0
      ? new MarketplaceWatcher({
          source: new HttpMarketplaceIndexSource(
            config.MARKETPLACE_INDEX_URL,
            log.child({ module: "marketplace" }),
          ),
          catalog: new PrismaPluginCatalogRepository(db),
          disable: async (install, reason) => {
            await registry.find(install.serverId)?.disablePlugin(install.pluginId, install.name, reason);
          },
          clock: systemClock,
          log: log.child({ module: "marketplace" }),
          intervalMs: config.MARKETPLACE_CHECK_MINUTES * 60_000,
        })
      : null;

  return {
    log,
    registry,
    marketplace,
    installFirstPartyPlugins: () =>
      installFirstPartyPlugins(
        loadFirstPartyPackages(config.firstPartyDir, log),
        new PrismaFirstPartyRepository(db),
        log.child({ module: "first-party" }),
      ),
    tickets: new TicketVerifier(config.WS_TICKET_SECRET, systemClock),
    subscriber,
    async close() {
      marketplace?.stop();
      await registry.shutdown();
      subscriber.disconnect();
      redis.disconnect();
      await db.$disconnect();
    },
  };
}

export type Container = Awaited<ReturnType<typeof createContainer>>;
