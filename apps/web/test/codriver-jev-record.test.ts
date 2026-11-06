import { describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({ codriverRequests: { create } }),
}));
vi.mock("@/lib/logger", () => ({ getLogger: () => ({ warn: vi.fn() }) }));

import { JEV_MODEL, type ModelUsage } from "@/lib/codriver/model";
import { recordRequest } from "@/lib/codriver/usage";

const planner: ModelUsage = {
  model: "claude-haiku-5-5",
  inputTokens: 100,
  outputTokens: 10,
  cacheReadTokens: 0,
};
const jev = (
  jevOutcome: ModelUsage["jevOutcome"],
  inputTokens = 300,
): ModelUsage => ({
  model: JEV_MODEL,
  inputTokens,
  outputTokens: 0,
  cacheReadTokens: 0,
  jevOutcome,
});

async function recorded(usage: ModelUsage[]) {
  create.mockClear();
  await recordRequest({
    serverId: "s",
    userId: null,
    login: "l",
    source: "game",
    text: "t",
    calls: [],
    status: "done",
    keySource: "shared",
    usage,
    latencyMs: 1,
  });
  return create.mock.calls[0][0].data;
}

describe("recording Jev", () => {
  it("stores the outcome and tokens apart from the planner's", async () => {
    expect(await recorded([jev("routed"), planner])).toMatchObject({
      jevOutcome: "routed",
      jevInputTokens: 300,
      modelCalls: 1,
      inputTokens: 100,
    });
  });

  it("leaves them empty when Jev was not asked", async () => {
    expect(await recorded([planner])).toMatchObject({
      jevOutcome: null,
      jevInputTokens: null,
    });
  });

  it("keeps the most telling outcome of several calls", async () => {
    expect(
      await recorded([
        jev("passed"),
        jev("fast_explicit", 200),
        jev("failed", 0),
      ]),
    ).toMatchObject({ jevOutcome: "fast_explicit", jevInputTokens: 500 });
  });

  it("records a failed call", async () => {
    expect(await recorded([jev("failed", 0), planner])).toMatchObject({
      jevOutcome: "failed",
      jevInputTokens: 0,
    });
  });
});
