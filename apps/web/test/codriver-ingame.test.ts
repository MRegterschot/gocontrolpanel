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
  clearTurns: vi.fn(),
  clearPending: vi.fn(),
  accessInput: vi.fn(),
  budgetStates: vi.fn(),
  record: vi.fn(),
  budgetAlert: vi.fn(),
  keyAlert: vi.fn(),
  reserve: vi.fn(),
  release: vi.fn(),
  requestCancel: vi.fn(),
  finish: vi.fn(),
  startRunning: vi.fn(),
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
vi.mock("@/lib/codriver/reservations", () => ({
  reservationMicros: () => 1000,
  reserveBudget: mocks.reserve,
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
vi.mock("@/lib/codriver/running", () => ({
  startRunning: mocks.startRunning,
  requestCancel: mocks.requestCancel,
}));
vi.mock("@/lib/codriver/pending", () => ({
  savePending: async (
    s: string,
    l: string,
    calls: unknown,
    source: string,
    steps?: unknown,
  ) => {
    const id = crypto.randomUUID();
    mocks.pending.set(
      `${source}:${s}:${l}`,
      JSON.stringify({ id, calls, steps }),
    );
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
    return { calls: pending.calls, steps: pending.steps };
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
      jevEnabled: false,
      jevApiKey: null,
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
    envJevApiKey: "",
    retentionDays: 90,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.config.CODRIVER.API_KEY = "key";
  mocks.pending.clear();
  mocks.turns.length = 0;
  mocks.requestCancel.mockResolvedValue(false);
  mocks.finish.mockResolvedValue(undefined);
  mocks.startRunning.mockResolvedValue({
    signal: new AbortController().signal,
    finish: mocks.finish,
  });
  mocks.actorForLogin.mockResolvedValue(moderator);
  mocks.cooldown.mockResolvedValue(true);
  mocks.accessInput.mockImplementation(async () => accessInput());
  mocks.budgetStates.mockResolvedValue([{ spent: false }]);
  mocks.release.mockResolvedValue(undefined);
  mocks.reserve.mockResolvedValue(mocks.release);
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

  it("refuses a request whose reservation doesn't fit the remaining budget", async () => {
    mocks.budgetStates.mockResolvedValue([{ spent: false }]);
    mocks.reserve.mockResolvedValueOnce(null);
    expect(await ask("play a snow map")).toContain("budget");
    expect(mocks.runCodriver).not.toHaveBeenCalled();
  });

  it("releases the reservation after recording the request", async () => {
    mocks.budgetStates.mockResolvedValue([{ spent: false }]);
    expect(await ask("skip")).toBe("Skipping.");
    expect(mocks.release).toHaveBeenCalledTimes(1);
    expect(mocks.record.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.release.mock.invocationCallOrder[0],
    );
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

  it("runs a stepped request one step at a time and resumes after a confirmation", async () => {
    const done = (reply: string) => ({
      status: "done",
      reply,
      calls: [{ tool: "x", input: {} }],
      usage: [],
      fastPath: false,
    });
    const confirmCall = { tool: "set_match_config", input: { maps: "BNL" } };
    mocks.runCodriver
      .mockResolvedValueOnce(done("Created BNL/TM_Cup_BNL.Script.txt."))
      .mockResolvedValueOnce(done("Map list is now BNL."))
      .mockResolvedValueOnce({
        status: "needs_confirmation",
        reply: "Set the Match plugin to 5 maps? Reply /co yes or /co no.",
        calls: [confirmCall],
        usage: [],
        fastPath: false,
      })
      .mockResolvedValueOnce(done("Ran /lobby of Match."));
    mocks.executeCalls.mockResolvedValueOnce({
      status: "done",
      reply: "Updated the Match plugin.",
      calls: [confirmCall],
    });

    expect(
      await ask(
        "Create a cup script. Save it in a BNL folder. Then load the BNL campaign, then set up the match plugin. Then go to the lobby.",
      ),
    ).toBe(
      "1. Created BNL/TM_Cup_BNL.Script.txt.\n2. Map list is now BNL.\n3. Set the Match plugin to 5 maps? Reply /co yes or /co no.",
    );
    expect(mocks.runCodriver).toHaveBeenCalledTimes(3);
    expect(mocks.runCodriver.mock.calls[1][0]).toMatchObject({
      text: "load the BNL campaign",
      history: [
        {
          request: "Create a cup script. Save it in a BNL folder.",
          reply: "Created BNL/TM_Cup_BNL.Script.txt.",
        },
      ],
    });
    // Each step keeps its templated reply
    expect(mocks.runCodriver.mock.calls[0][1]).toMatchObject({
      compose: false,
    });

    expect(await ask("yes")).toBe(
      "1. Created BNL/TM_Cup_BNL.Script.txt.\n2. Map list is now BNL.\n3. Updated the Match plugin.\n4. Ran /lobby of Match.",
    );
    expect(mocks.executeCalls).toHaveBeenCalledWith(expect.anything(), [
      confirmCall,
    ]);
    expect(mocks.runCodriver).toHaveBeenCalledTimes(4);
    expect(mocks.runCodriver.mock.calls[3][0].text).toBe("go to the lobby.");
    expect(mocks.runCodriver.mock.calls[3][0].history).toEqual(
      expect.arrayContaining([
        {
          request: "set up the match plugin.",
          reply: "Updated the Match plugin.",
        },
      ]),
    );
  });

  it("stops a stepped request at the first step that doesn't finish", async () => {
    mocks.runCodriver
      .mockResolvedValueOnce({
        status: "done",
        reply: "Created A.Script.txt.",
        calls: [],
        usage: [],
        fastPath: false,
      })
      .mockResolvedValueOnce({
        status: "unclear",
        reply: "Which club: Benelux, Benelux Cup?",
        calls: [],
        usage: [],
        fastPath: false,
      });
    expect(
      await ask("Make a script. Then load the campaign. Then go to the lobby."),
    ).toBe(
      "1. Created A.Script.txt.\n2. Which club: Benelux, Benelux Cup?\nStopped, so step 3 didn't run.",
    );
    expect(mocks.runCodriver).toHaveBeenCalledTimes(2);
  });

  it("stops a running request on cancel, instead of clearing the open question", async () => {
    mocks.requestCancel.mockResolvedValue(true);
    expect(await ask("cancel")).toBe("Okay, stopping your request.");
    expect(mocks.requestCancel).toHaveBeenCalledWith(serverId, "abc", "game");
  });

  it("does not let no stop a running request", async () => {
    mocks.requestCancel.mockResolvedValue(true);
    expect(await ask("no")).toBe("Nothing to cancel.");
    expect(mocks.requestCancel).not.toHaveBeenCalled();
  });

  it("tracks a slower request while it runs and always clears it", async () => {
    mocks.runCodriver.mockRejectedValue(new Error("boom"));
    await ask("play a snow map");
    expect(mocks.startRunning).toHaveBeenCalledWith(serverId, "abc", "game");
    expect(mocks.finish).toHaveBeenCalled();
  });

  it("does not track an exact command", async () => {
    await ask("skip");
    expect(mocks.startRunning).not.toHaveBeenCalled();
  });

  it("does not remember a cancelled request", async () => {
    mocks.runCodriver.mockResolvedValue({
      status: "cancelled",
      reply: "Request cancelled.",
      calls: [],
      usage: [],
      fastPath: false,
    });
    expect(await ask("play a snow map")).toBe("Request cancelled.");
    expect(mocks.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
    expect(mocks.turns).toEqual([]);
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
      handleCodriverRequest: mocks.handle,
    }));
    vi.doMock("@/lib/codriver/conversation", () => ({
      clearTurns: mocks.clearTurns,
    }));
    vi.doMock("@/lib/codriver/pending", () => ({
      clearPending: mocks.clearPending,
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
    mocks.handle.mockResolvedValue({ status: "done", reply: "Skipping." });
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
    expect(await response.json()).toEqual({
      data: { status: "done", reply: "Skipping." },
    });
    expect(mocks.handle).toHaveBeenCalledWith({ ...body, source: "game" });
  });

  it("clears the player's conversation and open question", async () => {
    const response = await post(
      { serverId, login: "abc", text: "", clear: true },
      `Bearer ${token}`,
    );
    expect(await response.json()).toEqual({
      data: { status: "done", reply: "Conversation cleared." },
    });
    expect(mocks.clearTurns).toHaveBeenCalledWith(serverId, "abc", "game");
    expect(mocks.clearPending).toHaveBeenCalledWith(serverId, "abc", "game");
    expect(mocks.handle).not.toHaveBeenCalled();
  });
});
