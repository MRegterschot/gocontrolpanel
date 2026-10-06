import websocket from "@fastify/websocket";
import Fastify, { LogController, type FastifyBaseLogger, type FastifyInstance } from "fastify";
import type { Logger } from "../core/logger";
import type { ServerRegistry } from "../core/server/server-registry";
import { errorHandler } from "./errors";
import { internalRoutes } from "./routes/internal";
import type { TicketVerifier } from "./ws/ticket-verifier";
import { wsRoutes } from "./ws/ws-routes";

export interface AppOptions {
  registry: ServerRegistry;
  log: Logger;
  serviceToken: string;
  tickets: TicketVerifier;
  allowedOrigins?: string[];
  heartbeatMs?: number;
}

// Builds the HTTP/WS app without listening, so tests can inject requests or bind port 0
export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: options.log as FastifyBaseLogger,
    bodyLimit: 1024 * 1024,
    // Routes log their own failures; per-request lines are noise for an internal API
    logController: new LogController({ disableRequestLogging: true }),
  });

  // Clients often send a JSON content type on bodyless POSTs (reconnect, disconnect, ...)
  const parseJson = app.getDefaultJsonParser("error", "error");
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    if (body === "") return done(null, undefined);
    parseJson(request, body.toString(), done);
  });

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({ error: { code: "NotFound", message: `Route ${request.url} not found` } }),
  );

  await app.register(websocket, { options: { maxPayload: 64 * 1024 } });

  app.get("/health", async () => ({
    status: "ok",
    servers: options.registry.list().length,
    connected: options.registry.list().filter((r) => r.isConnected).length,
  }));

  await app.register(internalRoutes, {
    registry: options.registry,
    serviceToken: options.serviceToken,
  });
  await app.register(wsRoutes, {
    registry: options.registry,
    tickets: options.tickets,
    allowedOrigins: options.allowedOrigins ?? [],
    heartbeatMs: options.heartbeatMs ?? 30_000,
  });

  return app;
}
