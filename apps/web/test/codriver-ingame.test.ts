import { sessionClaimsSchema } from "@gcp/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: { CODRIVER: { INTERNAL_TOKEN: "", API_KEY: "key" } },
  actorForLogin: vi.fn(),
  runCodriver: vi.fn(),
  executeCalls: vi.fn(),
  pending: new Map<string, string>(),
  cooldown: vi.fn(),
  findServer: vi.fn(),
  handle: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/config", () => ({ default: mocks.config }));
vi.mock("@/lib/logger", () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/lib/actor", async (original) => ({
  ...(await original<typeof import("@/lib/actor")>()),
  actorForLogin: mocks.actorForLogin,
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({ servers: { findFirst: mocks.findServer } }),
}));
vi.mock("@/lib/codriver/runner", () => ({
  runCodriver: mocks.runCodriver,
  executeCalls: mocks.executeCalls,
}));
vi.mock("@/lib/codriver/pending", () => ({
  savePending: async (s: string, l: string, calls: unknown) => {
    mocks.pending.set(`${s}:${l}`, JSON.stringify(calls));
  },
  takePending: async (s: string, l: string) => {
    const value = mocks.pending.get(`${s}:${l}`);
    mocks.pending.delete(`${s}:${l}`);
    return value ? JSON.parse(value) : null;
  },
  clearPending: async (s: string, l: string) =>
    mocks.pending.delete(`${s}:${l}`),
  takeCooldown: mocks.cooldown,
}));

import { guestActor } from "@/lib/actor";
import { handleCodriverMessage } from "@/lib/codriver/handle";

const serverId = "server-a";
const moderator = {
  userId: "user-1",
  login: "abc",
  displayName: "Player",
  claims: sessionClaimsSchema.parse({
    id: "user-1",
    admin: false,
    servers: [{ id: serverId, name: "A", role: "Moderator" }],
  }),
};
const deps = { createModel: () => ({ plan: vi.fn() }) };
const ask = (text: string) =>
  handleCodriverMessage({ serverId, login: "abc", text }, deps);

beforeEach(() => {
  mocks.config.CODRIVER.API_KEY = "key";
  mocks.pending.clear();
  mocks.actorForLogin.mockResolvedValue(moderator);
  mocks.cooldown.mockResolvedValue(true);
  mocks.runCodriver.mockResolvedValue({
    status: "done",
    reply: "Skipping.",
    calls: [{ tool: "skip_map", input: {} }],
    usage: [],
    fastPath: true,
  });
  mocks.executeCalls.mockResolvedValue({
    status: "done",
    reply: "Skipping.",
    calls: [],
  });
});

describe("handleCodriverMessage", () => {
  it("is off without an API key", async () => {
    mocks.config.CODRIVER.API_KEY = "";
    expect(await ask("skip")).toContain("not set up");
    expect(mocks.runCodriver).not.toHaveBeenCalled();
  });

  it("refuses players without a panel role on the server", async () => {
    mocks.actorForLogin.mockResolvedValue(guestActor("abc"));
    expect(await ask("status")).toContain("don't have access");
    expect(mocks.runCodriver).not.toHaveBeenCalled();
  });

  it("runs requests and returns the reply", async () => {
    expect(await ask("skip")).toBe("Skipping.");
    expect(mocks.runCodriver).toHaveBeenCalledWith(
      { serverId, actor: moderator, text: "skip" },
      expect.objectContaining({ primaryModel: "claude-haiku-5-5" }),
    );
  });

  it("keeps a confirmation question and runs exactly those calls on yes", async () => {
    const calls = [{ tool: "skip_map", input: {} }];
    mocks.runCodriver.mockResolvedValue({
      status: "needs_confirmation",
      reply: "Skip this map for everyone? Reply /co yes or /co no.",
      calls,
      usage: [],
      fastPath: true,
    });

    expect(await ask("skip")).toContain("/co yes");
    expect(await ask("yes")).toBe("Skipping.");
    expect(mocks.executeCalls).toHaveBeenCalledWith(
      { serverId, actor: moderator, role: "moderator" },
      calls,
    );
    // Taken once: a second yes has nothing left to run
    expect(await ask("yes")).toBe("Nothing to confirm.");
  });

  it("cancels a pending question", async () => {
    mocks.runCodriver.mockResolvedValue({
      status: "needs_confirmation",
      reply: "Skip?",
      calls: [{ tool: "skip_map", input: {} }],
      usage: [],
      fastPath: true,
    });
    await ask("skip");
    expect(await ask("no")).toBe("Cancelled.");
    expect(await ask("yes")).toBe("Nothing to confirm.");
    expect(mocks.executeCalls).not.toHaveBeenCalled();
  });

  it("drops an unanswered question when a new request arrives", async () => {
    mocks.runCodriver.mockResolvedValueOnce({
      status: "needs_confirmation",
      reply: "Skip?",
      calls: [{ tool: "skip_map", input: {} }],
      usage: [],
      fastPath: true,
    });
    await ask("skip");
    await ask("status");
    expect(await ask("yes")).toBe("Nothing to confirm.");
  });

  it("rate limits requests but not confirmations", async () => {
    mocks.cooldown.mockResolvedValue(false);
    expect(await ask("skip")).toContain("One moment");
    expect(mocks.runCodriver).not.toHaveBeenCalled();
    expect(await ask("no")).toBe("Nothing to cancel.");
  });

  it("hides internal errors from the player", async () => {
    mocks.runCodriver.mockRejectedValue(new Error("401 invalid x-api-key"));
    expect(await ask("cup mode")).toBe("Codriver is unavailable right now.");
  });
});

describe("POST /api/internal/codriver", () => {
  const token = "t".repeat(32);

  async function post(body: unknown, authorization?: string) {
    vi.doMock("@/lib/codriver/handle", () => ({
      handleCodriverMessage: mocks.handle,
    }));
    const { POST } = await import("@/app/api/internal/codriver/route");
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (authorization) headers.authorization = authorization;
    return POST(
      new Request("http://panel/api/internal/codriver", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
    );
  }

  const body = { serverId, login: "abc", text: "skip" };

  beforeEach(() => {
    mocks.config.CODRIVER.INTERNAL_TOKEN = token;
    mocks.findServer.mockResolvedValue({ id: serverId });
    mocks.handle.mockResolvedValue("Skipping.");
  });

  it("is not found without a strong enough token", async () => {
    mocks.config.CODRIVER.INTERNAL_TOKEN = "short";
    expect((await post(body, "Bearer short")).status).toBe(404);
  });

  it("rejects a missing or wrong token", async () => {
    expect((await post(body)).status).toBe(401);
    expect((await post(body, `Bearer ${"x".repeat(32)}`)).status).toBe(401);
    expect(mocks.handle).not.toHaveBeenCalled();
  });

  it("rejects unknown servers and invalid bodies", async () => {
    expect((await post({ login: "abc" }, `Bearer ${token}`)).status).toBe(400);
    mocks.findServer.mockResolvedValue(null);
    expect((await post(body, `Bearer ${token}`)).status).toBe(404);
    expect(mocks.handle).not.toHaveBeenCalled();
  });

  it("passes only server, login and text on and returns the reply", async () => {
    const response = await post({ ...body, role: "admin" }, `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { reply: "Skipping." } });
    expect(mocks.handle).toHaveBeenCalledWith(body);
  });
});
