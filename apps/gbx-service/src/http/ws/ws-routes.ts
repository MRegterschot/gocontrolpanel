import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { ServerRegistry } from "../../core/server/server-registry";
import { channels, CloseCode, type ChannelDefinition } from "./channels";
import type { TicketVerifier } from "./ticket-verifier";

export interface WsRouteOptions {
  registry: ServerRegistry;
  tickets: TicketVerifier;
  // Browser origins allowed to open sockets; empty allows any
  allowedOrigins: string[];
  heartbeatMs: number;
}

function keepAlive(socket: WebSocket, intervalMs: number): () => void {
  let alive = true;
  socket.on("pong", () => (alive = true));
  const timer = setInterval(() => {
    if (!alive) {
      socket.terminate();
      return;
    }
    alive = false;
    socket.ping();
  }, intervalMs);
  return () => clearInterval(timer);
}

export async function wsRoutes(app: FastifyInstance, opts: WsRouteOptions) {
  // Limit connection attempts across all channels before upgrades and ticket verification.
  // Registration stays inside this scope so health and internal routes are unaffected.
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute", hook: "onRequest" });
  const register = (channel: ChannelDefinition) => {
    app.get(channel.path, { websocket: true }, async (socket, request) => {
      const close = (code: number, reason: string) => {
        if (socket.readyState === socket.OPEN) socket.close(code, reason);
      };

      const origin = request.headers.origin;
      if (opts.allowedOrigins.length > 0 && (!origin || !opts.allowedOrigins.includes(origin))) {
        return close(CloseCode.Forbidden, "Origin not allowed");
      }

      const ticket = (request.query as Record<string, string | undefined>).ticket;
      if (!ticket) return close(CloseCode.Unauthorized, "Missing ticket");

      let claims;
      try {
        claims = await opts.tickets.verify(ticket);
      } catch (error) {
        request.log.debug({ err: error }, "Rejected WS ticket");
        return close(CloseCode.Unauthorized, "Invalid ticket");
      }

      const result = channel.open({
        claims,
        params: request.params as Record<string, string>,
        registry: opts.registry,
        send: (message) => {
          if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
        },
        close,
      });

      if (!result.ok) return close(result.code, result.reason);

      const stopHeartbeat = keepAlive(socket, opts.heartbeatMs);
      socket.once("close", () => {
        stopHeartbeat();
        result.cleanup();
      });
    });
  };

  channels.forEach(register);
}
