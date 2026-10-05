import { signWsTicket, sessionClaimsSchema, type SessionClaims } from "@tmcp/shared";
import type { FastifyInstance } from "fastify";
import { ServerRegistry } from "../../src/core/server/server-registry";
import { buildApp } from "../../src/http/app";
import { TicketVerifier } from "../../src/http/ws/ticket-verifier";
import { createHarness, type HarnessOptions } from "../fakes/harness";
import { silentLogger } from "../fakes/logger";

export const SERVICE_TOKEN = "service-token-".padEnd(40, "x");
export const TICKET_SECRET = "ticket-secret-".padEnd(40, "y");

export function claims(overrides: Partial<SessionClaims> = {}): SessionClaims {
  return sessionClaimsSchema.parse({ id: "user-1", admin: false, ...overrides });
}

export const ticketFor = (overrides: Partial<SessionClaims> = {}) =>
  signWsTicket(claims(overrides), TICKET_SECRET);

export async function createApp(options: HarnessOptions & { allowedOrigins?: string[] } = {}) {
  const h = await createHarness(options);
  const registry = new ServerRegistry({
    servers: h.servers,
    createRuntime: () => h.runtime,
    log: silentLogger,
  });
  registry.add(h.runtime.serverId);

  const app: FastifyInstance = await buildApp({
    registry,
    log: silentLogger,
    serviceToken: SERVICE_TOKEN,
    tickets: new TicketVerifier(TICKET_SECRET, h.clock),
    allowedOrigins: options.allowedOrigins,
  });

  const request = (method: "GET" | "POST" | "PUT", url: string, payload?: unknown) =>
    app.inject({
      method,
      url,
      payload: payload as never,
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` },
    });

  return { h, app, registry, request };
}
