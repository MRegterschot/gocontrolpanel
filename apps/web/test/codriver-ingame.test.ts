import { sessionClaimsSchema } from "@gcp/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: { CODRIVER: { INTERNAL_TOKEN: "", API_KEY: "key" } },
  actorForLogin: vi.fn(),
  runCodriver: vi.fn(),
  executeCalls: vi.fn(),
  pending: new Map<string, string>(),
  saveFeedback: vi.fn(),
  turns: [] as { request: string; reply: string }[],
  cooldown: vi.fn(),
  findServer: vi.fn(),
  handle: vi.fn(),
  accessInput: vi.fn(),
  budgetStates: vi.fn(),
  record: vi.fn(),
  budgetAlert: vi.fn(),
  keyAlert: vi.fn(),
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
vi.mock("@/lib/codriver/settings", () => ({
  loadAccessInput: mocks.accessInput,
}));
vi.mock("@/lib/codriver/usage", () => ({
  budgetStates: mocks.budgetStates,
  isSpent: (state: { spent: boolean }) => state.spent,
  recordRequest: mocks.record,
  pruneRequests: vi.fn(),
}));
vi.mock("@/lib/codriver/alerts", () => ({
  notifyBudgetCrossings: mocks.budgetAlert,
  notifyKeyRejected: mocks.keyAlert,
}));
vi.mock("@/lib/codriver/conversation", () => ({
  loadTurns: async (_s: string, _l: string, _src: string, limit: number) =>
    limit > 0 ? mocks.turns.slice(-limit) : [],
  appendTurn: async (
    _s: string,
    _l: string,
    _src: string,
    turn: { request: string; reply: string },
  ) => void mocks.turns.push(turn),
}));
vi.mock("@/lib/codriver/feedback", async (original) => ({
  ...(await original<typeof import("@/lib/codriver/feedback")>()),
  saveFeedback: mocks.saveFeedback,
}));
vi.mock("@/lib/codriver/pending", () => ({
  savePending: async (s: string, l: string, calls: unknown, source: string) => {
    const id = crypto.randomUUID();
    mocks.pending.set(`${source}:${s}:${l}`, JSON.stringify({ id, calls }));
    return id;
  },
  takePending: async (
    s: string,
    l: string,
    source: string,
    expectedId?: string,
  ) => {
    const key = `${source}:${s}:${l}`;
    const value = mocks.pending.get(key);
    if (!value) return null;
    const pending = JSON.parse(value);
    if (expectedId && pending.id !== expectedId) return null;
    mocks.pending.delete(key);
    return pending.calls;
  },
  clearPending: async (s: string, l: string, source: string) =>
    mocks.pending.delete(`${source}:${s}:${l}`),
  takeCooldown: mocks.cooldown,
}));

import { guestActor } from "@/lib/actor";
import {
  handleCodriverMessage,
  handleCodriverRequest,
} from "@/lib/codriver/handle";

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
const deps = {
  createModel: () => ({ plan: vi.fn() }),
  now: () => 0,
  random: () => 1,
};
const ask = (text: string) =>
  handleCodriverMessage({ serverId, login: "abc", text, source: "game" }, deps);

// Allowed with the shared key; the rules themselves are covered in codriver-access.test.ts
function accessInput(overrides = {}) {
  return {
    panel: {
      enabled: true,
      sharedApiKey: "shared",
      sharedKeyModels: ["haiku", "sonnet"],
      sharedMonthlyBudgetCents: null,
      allowServerKeys: false,
      userMode: "everyone",
    },
    serverRule: {
      effect: "allow",
      useSharedKey: true,
      sharedMonthlyBudgetCents: 500,
    },
    groupRules: [],
    userRule: null,
    server: {
      enabled: true,
      apiKey: null,
      model: "haiku",
      escalation: true,
      monthlyBudgetCents: null,
      guestAccess: "off",
      memberAccess: false,
      cooldownSeconds: 3,
      memoryTurns: 6,
    },
    role: "moderator",
    envApiKey: "",
    retentionDays: 90,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.config.CODRIVER.API_KEY = "key";
  mocks.pending.clear();
  mocks.turns.length = 0;
  mocks.actorForLogin.mockResolvedValue(moderator);
  mocks.cooldown.mockResolvedValue(true);
  mocks.accessInput.mockImplementation(async () => accessInput());
  mocks.budgetStates.mockResolvedValue([{ spent: false }]);
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
  it("replies with the access layer's reason when refused", async () => {
    mocks.accessInput.mockResolvedValue(accessInput({ panel: null }));
    expect(await ask("skip")).toBe("Codriver is not enabled on this panel.");
    expect(mocks.runCodriver).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("looks up a guest's access as a guest", async () => {
    mocks.actorForLogin.mockResolvedValue(guestActor("abc"));
    await ask("status");
    expect(mocks.accessInput).toHaveBeenCalledWith(
      serverId,
      expect.anything(),
      "guest",
    );
  });

  it("records each request with its key and usage", async () => {
    const usage = [
      {
        model: "claude-haiku-5-5",
        inputTokens: 1,
        outputTokens: 1,
        cacheReadTokens: 0,
      },
    ];
    mocks.runCodriver.mockResolvedValue({
      status: "done",
      reply: "Queued.",
      calls: [],
      usage,
      fastPath: false,
    });
    await ask("play a snow map");
    expect(mocks.record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "done",
        keySource: "shared",
        usage,
        source: "game",
      }),
    );
  });

  it("stops model requests when a budget is spent but keeps exact commands", async () => {
    mocks.budgetStates.mockResolvedValue([{ spent: true }]);
    expect(await ask("play a snow map")).toContain("budget");
    expect(mocks.runCodriver).not.toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: "over_budget" }),
    );

    expect(await ask("skip")).toBe("Skipping.");
  });

  it("runs requests and returns the reply", async () => {
    expect(await ask("skip")).toBe("Skipping.");
    expect(mocks.runCodriver).toHaveBeenCalledWith(
      { serverId, actor: moderator, text: "skip", history: [] },
      expect.objectContaining({ primaryModel: "claude-haiku-5-5" }),
    );
  });

  it("saves /feedback on the previous request without running Codriver", async () => {
    mocks.saveFeedback.mockResolvedValue({
      saved: true,
      reply: "Thanks, I added your feedback.",
    });
    expect(await ask("/feedback wrong map")).toBe(
      "Thanks, I added your feedback.",
    );
    expect(mocks.saveFeedback).toHaveBeenCalledWith({
      serverId,
      login: "abc",
      source: "game",
      text: "wrong map",
    });
    expect(mocks.runCodriver).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.cooldown).not.toHaveBeenCalled();
  });

  it("remembers earlier turns and hands them to the next request", async () => {
    await ask("skip");
    await ask("and again");
    expect(mocks.runCodriver).toHaveBeenLastCalledWith(
      expect.objectContaining({
        history: [{ request: "skip", reply: "Skipping." }],
      }),
      expect.anything(),
    );
  });

  it("keeps no memory when the server turned it off", async () => {
    const base = accessInput();
    mocks.accessInput.mockResolvedValue({
      ...base,
      server: { ...base.server, memoryTurns: 0 },
    });
    await ask("skip");
    await ask("and again");
    expect(mocks.turns).toHaveLength(0);
    expect(mocks.runCodriver).toHaveBeenLastCalledWith(
      expect.objectContaining({ history: [] }),
      expect.anything(),
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

  it("keeps panel and game confirmations separate", async () => {
    mocks.runCodriver.mockResolvedValue({
      status: "needs_confirmation",
      reply: "Skip?",
      calls: [{ tool: "skip_map", input: {} }],
      usage: [],
      fastPath: true,
    });
    await ask("skip");
    const panel = await handleCodriverRequest(
      {
        serverId,
        login: "abc",
        text: "yes",
        source: "panel",
        confirmationId: crypto.randomUUID(),
      },
      deps,
      moderator,
    );
    expect(panel).toEqual({ status: "unclear", reply: "Nothing to confirm." });
    expect(mocks.executeCalls).not.toHaveBeenCalled();
    expect(await ask("yes")).toBe("Skipping.");
  });

  it("does not confirm a different request opened in another panel tab", async () => {
    mocks.runCodriver.mockResolvedValue({
      status: "needs_confirmation",
      reply: "Skip?",
      calls: [{ tool: "skip_map", input: {} }],
      usage: [],
      fastPath: true,
    });
    const message = {
      serverId,
      login: "abc",
      text: "skip",
      source: "panel" as const,
    };
    const first = await handleCodriverRequest(message, deps, moderator);
    const second = await handleCodriverRequest(message, deps, moderator);
    const stale = await handleCodriverRequest(
      { ...message, text: "yes", confirmationId: first.confirmationId },
      deps,
      moderator,
    );
    expect(stale.status).toBe("unclear");
    expect(mocks.executeCalls).not.toHaveBeenCalled();
    const current = await handleCodriverRequest(
      { ...message, text: "yes", confirmationId: second.confirmationId },
      deps,
      moderator,
    );
    expect(current.status).toBe("done");
    expect(mocks.executeCalls).toHaveBeenCalledTimes(1);
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

  it("reports budget crossings with the request's cost", async () => {
    const states = [{ spent: false }];
    mocks.budgetStates.mockResolvedValue(states);
    mocks.record.mockResolvedValue(1234);
    await ask("play a snow map");
    expect(mocks.budgetAlert).toHaveBeenCalledWith(serverId, states, 1234);
  });

  it("tells admins when the key is rejected", async () => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    mocks.runCodriver.mockRejectedValue(
      new Anthropic.AuthenticationError(
        401,
        undefined,
        "invalid x-api-key",
        new Headers(),
      ),
    );
    expect(await ask("cup mode")).toBe("Codriver is unavailable right now.");
    expect(mocks.keyAlert).toHaveBeenCalledWith(serverId, "shared");
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
    expect(mocks.handle).toHaveBeenCalledWith({ ...body, source: "game" });
  });
});
