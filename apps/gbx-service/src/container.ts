import { createPrismaClient } from "@gcp/db";
import pino from "pino";
import type { Config } from "./config";
import { TemplateRenderer } from "./core/manialink/template-renderer";
import { builtinPlugins } from "./core/plugins/builtin";
import { systemClock } from "./core/ports";
import { ServerRegistry } from "./core/server/server-registry";
import { ServerRuntime, type RuntimeDependencies } from "./core/server/server-runtime";
import {
  PrismaMapRepository,
  PrismaMatchRepository,
  PrismaNotificationRepository,
  PrismaPlayerRepository,
  PrismaRecordRepository,
  PrismaServerRepository,
} from "./infra/db/prisma-repositories";
import { HttpEcmClient } from "./infra/ecm/ecm-client";
import { EvotmGbxSession } from "./infra/gbx/evotm-session";
import { NadeoClient } from "./infra/nadeo/nadeo-client";
import { RedisCache } from "./infra/redis/cache";
import { RedisJukeboxStore } from "./infra/redis/jukebox-store";
import { RedisRateLimiter } from "./infra/redis/rate-limiter";
import { createRedis } from "./infra/redis/redis";
import { loadTemplateSources } from "./infra/templates";
import { TicketVerifier } from "./http/ws/ticket-verifier";

// Composition root: the only place that picks concrete implementations
export function createContainer(config: Config) {
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

  const runtimeDeps: RuntimeDependencies = {
    log,
    clock: systemClock,
    sessionFactory: () => new EvotmGbxSession(log.child({ module: "gbx" })),
    renderer: new TemplateRenderer(loadTemplateSources(config.templatesDir)),
    plugins: builtinPlugins,
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
    ecm: new HttpEcmClient(log.child({ module: "ecm" }), config.ECM_URL),
  };

  const registry = new ServerRegistry({
    servers,
    createRuntime: (serverId) => new ServerRuntime(serverId, runtimeDeps),
    log: log.child({ module: "registry" }),
    enabledServerIds: config.GBX_SERVICE_ENABLED_SERVERS,
  });

  return {
    log,
    registry,
    tickets: new TicketVerifier(config.WS_TICKET_SECRET, systemClock),
    subscriber,
    async close() {
      await registry.shutdown();
      subscriber.disconnect();
      redis.disconnect();
      await db.$disconnect();
    },
  };
}

export type Container = ReturnType<typeof createContainer>;
