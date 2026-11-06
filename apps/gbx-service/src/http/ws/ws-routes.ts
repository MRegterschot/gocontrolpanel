import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { ServerGateway } from "../../core/cluster/gateway";
import { channels, CloseCode, type ChannelDefinition } from "./channels";
import type { TicketVerifier } from "./ticket-verifier";

export interface WsRouteOptions {
  gateway: ServerGateway;
  tickets: TicketVerifier;
  // Browser origins allowed to open sockets; empty allows any
  allowedOrigins: string[];
  heartbeatMs: number;
  // Permissions are only checked on connect, so every socket is closed after about this long
  maxLifetimeMs: number;
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
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    hook: "onRequest",
  });
  const register = (channel: ChannelDefinition) => {
    app.get(channel.path, { websocket: true }, async (socket, request) => {
      const close = (code: number, reason: string) => {
        if (socket.readyState === socket.OPEN) socket.close(code, reason);
      };

      const origin = request.headers.origin;
      if (
        opts.allowedOrigins.length > 0 &&
        (!origin || !opts.allowedOrigins.includes(origin))
      ) {
        return close(CloseCode.Forbidden, "Origin not allowed");
      }

      const ticket = (request.query as Record<string, string | undefined>)
        .ticket;
      if (!ticket) return close(CloseCode.Unauthorized, "Missing ticket");

      let claims;
      try {
        claims = await opts.tickets.verify(ticket);
      } catch (error) {
        request.log.debug({ err: error }, "Rejected WS ticket");
        return close(CloseCode.Unauthorized, "Invalid ticket");
      }

      let result;
      try {
        result = await channel.open({
          claims,
          params: request.params as Record<string, string>,
          gateway: opts.gateway,
          send: (message) => {
            if (socket.readyState === socket.OPEN)
              socket.send(JSON.stringify(message));
          },
          close,
        });
      } catch (error) {
        request.log.warn({ err: error }, "Could not open WS channel");
        return close(1011, "Could not load the server state");
      }

      if (!result.ok) return close(result.code, result.reason);
      // The client may have gone while the channel was loading
      if (socket.readyState !== socket.OPEN) return result.cleanup();

      const stopHeartbeat = keepAlive(socket, opts.heartbeatMs);
      // Jitter, so sockets opened together don't all reconnect at once
      const lifetime = opts.maxLifetimeMs * (0.9 + Math.random() * 0.2);
      const expiry = setTimeout(
        () => close(CloseCode.Reauthenticate, "Session refresh"),
        lifetime,
      );
      socket.once("close", () => {
        clearTimeout(expiry);
        stopHeartbeat();
        result.cleanup();
      });
    });
  };

  channels.forEach(register);
}
