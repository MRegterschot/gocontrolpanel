import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  execute: vi.fn(),
  permission: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/ratelimiter", () => ({
  takeRateLimitToken: async () => ({ allowed: true, retryAfterMs: 0 }),
}));
vi.mock("@/lib/api-keys/authenticate", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  authenticateApiKey: mocks.authenticate,
}));
vi.mock("@/lib/actor", () => ({ requirePermission: mocks.permission }));
vi.mock("@/lib/gbx-service", () => ({
  gbxService: { executeCommand: mocks.execute },
}));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: mocks.audit,
}));

import { POST } from "@/app/api/v1/servers/[serverId]/commands/route";
import { ServerError } from "@/types/responses";
import { serverPermissions } from "@gcp/shared";
import { actor, ctx, onA, principal, req } from "./helpers/public-api";

const send = (body: unknown) =>
  POST(req("/servers/server-a/commands", { method: "POST", body }), onA());

const result = {
  command: "example",
  login: "creator",
  handled: true,
  source: "plugin",
  messages: ["Command reply"],
  messagesTruncated: false,
  outputComplete: false,
  durationMs: 2,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticate.mockResolvedValue(principal());
  mocks.execute.mockResolvedValue(result);
});

describe("v1 commands", () => {
  it("accepts the built-in Codriver draft command", async () => {
    const res = await send({ command: "/CO+", params: ["a draft"] });
    expect(res.status).toBe(200);
    expect(mocks.execute).toHaveBeenCalledWith("server-a", {
      command: "co+",
      params: ["a draft"],
      login: "creator",
    });
  });

  it("normalizes command names and preserves params, using the creator's identity", async () => {
    const res = await send({
      command: "/EXAMPLE",
      params: ["two words", "secret"],
      login: "another-admin",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: result });
    expect(mocks.permission).toHaveBeenCalledWith(
      actor,
      serverPermissions.admin,
      "server-a",
    );
    expect(mocks.execute).toHaveBeenCalledWith("server-a", {
      command: "example",
      params: ["two words", "secret"],
      login: "creator",
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      actor.userId,
      "server-a",
      "server.commands.execute",
      { command: "example", handled: true },
    );
  });

  it("defaults params and reports unknown commands", async () => {
    const unknown = {
      ...result,
      command: "unknown",
      handled: false,
      source: null,
      messages: [],
      outputComplete: true,
    };
    mocks.execute.mockResolvedValue(unknown);
    const res = await send({ command: "unknown" });
    expect(await res.json()).toEqual({ data: unknown });
    expect(mocks.execute).toHaveBeenCalledWith("server-a", {
      command: "unknown",
      params: [],
      login: "creator",
    });
  });

  it.each([
    { command: "" },
    { command: "help match" },
    { command: "//help" },
    { command: "help", params: "match" },
    { command: "help", params: [1] },
    { command: "help", params: Array(21).fill("x") },
    { command: "help", params: ["x".repeat(1001)] },
  ])("rejects invalid input %j", async (body) => {
    expect((await send(body)).status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("requires commands:write even for keys that can send chat or configure plugins", async () => {
    mocks.authenticate.mockResolvedValue(
      principal(["chat:write", "plugins:write"]),
    );
    expect((await send({ command: "help" })).status).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("rejects servers outside the key's target", async () => {
    const res = await POST(
      req("/servers/other/commands", {
        method: "POST",
        body: { command: "help" },
      }),
      ctx({ serverId: "other" }),
    );
    expect(res.status).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("enforces server admin permission in the action helper", async () => {
    mocks.permission.mockImplementation(() => {
      throw new ServerError("Unauthorized", "Unauthorized");
    });
    expect((await send({ command: "help" })).status).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("propagates an offline service error", async () => {
    mocks.execute.mockRejectedValue(
      new ServerError("Offline", "ServerNotConnected"),
    );
    expect((await send({ command: "help" })).status).toBe(503);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
