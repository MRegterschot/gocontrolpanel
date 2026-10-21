import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  takeToken: vi.fn(),
  logError: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.logError, warn: vi.fn() },
}));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/ratelimiter", () => ({ takeRateLimitToken: mocks.takeToken }));
vi.mock("@/lib/api-keys/authenticate", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  authenticateApiKey: mocks.authenticate,
}));

import type { ApiKeyPrincipal } from "@/lib/api-keys/authenticate";
import { currentApiKeyId } from "@/lib/api-keys/context";
import { notFound, publicApiRoute } from "@/lib/public-api/route";
import { ServerError } from "@/types/responses";
import {
  getServer,
  kickPlayer,
  listMatches,
  listServers,
} from "@gcp/shared/public-api";
import { NextRequest } from "next/server";

const server = { id: "server-a", name: "A", description: "a" };

function principal(overrides: Partial<ApiKeyPrincipal> = {}): ApiKeyPrincipal {
  return {
    keyId: "key-1",
    name: "Bot",
    scopes: ["server:read", "players:write", "matches:read"],
    target: { type: "server", serverId: server.id },
    servers: [server],
    actor: {
      userId: "user-1",
      login: "creator",
      displayName: "Bot (API key)",
      claims: {} as never,
      apiKeyId: "key-1",
    },
    ...overrides,
  };
}

function req(
  path: string,
  init: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {},
) {
  return new NextRequest(`http://localhost/api/v1${path}`, {
    method: init.method ?? "GET",
    body: init.body,
    headers: { authorization: "Bearer gcp_x", ...init.headers },
  });
}

// The context the handler was first called with
const firstCall = (fn: { mock: { calls: unknown[][] } }) =>
  fn.mock.calls[0][0] as { params: unknown; query: unknown; body: unknown };

const ctx = (params: Record<string, string> = {}) => ({
  params: Promise.resolve(params),
});

const serverRoute = (handler = vi.fn(async () => ({ data: server }))) => ({
  handler,
  route: publicApiRoute(getServer, handler),
});

beforeEach(() => {
  mocks.authenticate.mockResolvedValue(principal());
  mocks.takeToken.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
});

describe("publicApiRoute", () => {
  it("answers with the contract's shape and is never cached", async () => {
    const { route } = serverRoute();
    const res = await route(
      req("/servers/server-a"),
      ctx({ serverId: "server-a" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ data: server });
  });

  it("authenticates from the Authorization header only, never the session cookie", async () => {
    mocks.authenticate.mockRejectedValue(
      new ServerError("Missing or malformed API key", "InvalidApiKey"),
    );
    const handler = vi.fn();
    const res = await publicApiRoute(listServers, handler)(
      new NextRequest("http://localhost/api/v1/servers", {
        headers: { cookie: "authjs.session-token=abc" },
      }),
      ctx(),
    );

    expect(mocks.authenticate).toHaveBeenCalledWith(null);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "InvalidApiKey", message: "Missing or malformed API key" },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("rate limits per key with Retry-After", async () => {
    mocks.takeToken.mockResolvedValue({ allowed: false, retryAfterMs: 2500 });
    const { route, handler } = serverRoute();

    const res = await route(
      req("/servers/server-a"),
      ctx({ serverId: "server-a" }),
    );

    expect(mocks.takeToken).toHaveBeenCalledWith(
      expect.objectContaining({ key: "api-key:key-1" }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3");
    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects a key without the endpoint's scope", async () => {
    mocks.authenticate.mockResolvedValue(principal({ scopes: ["maps:read"] }));
    const { route, handler } = serverRoute();

    const res = await route(
      req("/servers/server-a"),
      ctx({ serverId: "server-a" }),
    );

    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("MissingScope");
    expect(handler).not.toHaveBeenCalled();
  });

  it("lets any key call an endpoint without a scope", async () => {
    mocks.authenticate.mockResolvedValue(principal({ scopes: [] }));
    const res = await publicApiRoute(listServers, async ({ principal }) => ({
      data: principal.servers,
    }))(req("/servers"), ctx());
    expect(res.status).toBe(200);
  });

  it("rejects a server the key cannot reach before running the handler", async () => {
    const { route, handler } = serverRoute();
    const res = await route(
      req("/servers/server-b"),
      ctx({ serverId: "server-b" }),
    );
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("validates path parameters", async () => {
    const { route } = serverRoute();
    const res = await route(req("/servers/a%2Fb"), ctx({ serverId: "a/b" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("ValidationError");
    expect(body.error.issues[0].path).toBe("params.serverId");
  });

  it("parses the query with defaults and rejects bad values", async () => {
    const handler = vi.fn(async () => ({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    }));
    const route = publicApiRoute(listMatches, handler);

    await route(
      req("/servers/server-a/matches"),
      ctx({ serverId: "server-a" }),
    );
    expect(firstCall(handler).query).toEqual({ page: 1, pageSize: 20 });

    const res = await route(
      req("/servers/server-a/matches?pageSize=500"),
      ctx({ serverId: "server-a" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.issues[0].path).toBe("query.pageSize");
  });

  describe("bodies", () => {
    const kickCtx = () => ctx({ serverId: "server-a", login: "player1" });
    const kick = (body?: string, headers?: Record<string, string>) =>
      req("/servers/server-a/players/player1/kick", {
        method: "POST",
        body,
        headers,
      });

    it("passes the parsed body and answers 204 without content", async () => {
      const handler = vi.fn(async () => undefined);
      const res = await publicApiRoute(kickPlayer, handler)(
        kick(JSON.stringify({ reason: "afk" })),
        kickCtx(),
      );
      expect(res.status).toBe(204);
      expect(await res.text()).toBe("");
      expect(firstCall(handler)).toMatchObject({
        params: { serverId: "server-a", login: "player1" },
        body: { reason: "afk" },
      });
    });

    it("treats a missing body as empty", async () => {
      const handler = vi.fn(async () => undefined);
      await publicApiRoute(kickPlayer, handler)(kick(), kickCtx());
      expect(firstCall(handler).body).toEqual({ reason: "" });
    });

    it.each([
      ["invalid JSON", "{nope", 400],
      ["an invalid field", JSON.stringify({ reason: "x".repeat(201) }), 400],
      [
        "an oversized body",
        JSON.stringify({ reason: "x".repeat(70_000) }),
        413,
      ],
    ])("rejects %s", async (_, body, status) => {
      const handler = vi.fn();
      const res = await publicApiRoute(kickPlayer, handler)(
        kick(body),
        kickCtx(),
      );
      expect(res.status).toBe(status);
      expect(handler).not.toHaveBeenCalled();
    });

    it("rejects an oversized Content-Length before reading", async () => {
      const res = await publicApiRoute(kickPlayer, vi.fn())(
        kick("{}", { "content-length": "999999" }),
        kickCtx(),
      );
      expect(res.status).toBe(413);
    });
  });

  it("strips fields the contract does not declare", async () => {
    const { route } = serverRoute(
      vi.fn(async () => ({
        data: { ...server, password: "secret" },
        extra: 1,
      })) as never,
    );
    const res = await route(
      req("/servers/server-a"),
      ctx({ serverId: "server-a" }),
    );
    expect(await res.json()).toEqual({ data: server });
  });

  it("answers 500 without details when the response breaks the contract", async () => {
    const { route } = serverRoute(
      vi.fn(async () => ({ data: { id: "server-a" } })) as never,
    );
    const res = await route(
      req("/servers/server-a"),
      ctx({ serverId: "server-a" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).toBe("Internal server error");
    expect(mocks.logError).toHaveBeenCalled();
  });

  it.each([
    [
      "a permission failure",
      new ServerError("Unauthorized", "Unauthorized"),
      403,
      "Unauthorized",
    ],
    ["a missing record", notFound("Match not found"), 404, "Match not found"],
    [
      "a disconnected server",
      new ServerError("Offline", "ServerNotConnected"),
      503,
      "Offline",
    ],
    [
      "an unexpected error",
      new Error("db password is hunter2"),
      500,
      "Internal server error",
    ],
  ])("maps %s", async (_, thrown, status, message) => {
    const { route } = serverRoute(vi.fn(async () => Promise.reject(thrown)));
    const res = await route(
      req("/servers/server-a"),
      ctx({ serverId: "server-a" }),
    );
    expect(res.status).toBe(status);
    expect((await res.json()).error.message).toBe(message);
  });

  it("runs the handler under the key, for audit entries", async () => {
    let seen: string | null = null;
    const { route } = serverRoute(
      vi.fn(async () => {
        seen = currentApiKeyId();
        return { data: server };
      }),
    );
    await route(req("/servers/server-a"), ctx({ serverId: "server-a" }));
    expect(seen).toBe("key-1");
    expect(currentApiKeyId()).toBeNull();
  });
});
