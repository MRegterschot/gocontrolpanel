import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
  getLogger: () => ({ warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => {
    throw new Error("Evaluation touched the database");
  },
}));
vi.mock("@/lib/codriver/state", () => ({
  getLiveState: () => {
    throw new Error("Evaluation touched a server");
  },
}));
vi.mock("@/lib/codriver/events", () => ({
  emitAction: () => {
    throw new Error("Evaluation emitted an action");
  },
}));

import cases from "@/lib/codriver/eval/cases.json";
import { evalCaseSchema, grade } from "@/lib/codriver/eval/grader";
import { evaluateCase } from "@/lib/codriver/eval/run";
import { codriverTools } from "@/lib/codriver/registry";

const dataset = cases.map((test) => evalCaseSchema.parse(test));
it("has 50-100 unique cases with valid expected tool inputs", () => {
  expect(dataset.length).toBeGreaterThanOrEqual(50);
  expect(dataset.length).toBeLessThanOrEqual(100);
  expect(new Set(dataset.map((test) => test.id)).size).toBe(dataset.length);
  for (const test of dataset)
    if (test.expected.kind === "calls")
      for (const call of test.expected.calls) {
        expect(
          codriverTools
            .find((tool) => tool.name === call.tool)
            ?.input.safeParse(call.input).success,
          test.id,
        ).toBe(true);
      }
});

describe("evaluation grading", () => {
  it("normalizes setting aliases and values, but catches wrong points", () => {
    const test = dataset.find((test) => test.id === "mode-points")!;
    const outcome = {
      status: "planned" as const,
      reply: "",
      calls: [
        {
          tool: "set_mode_settings",
          input: { settings: [{ name: "S_PointsLimit", value: "100" }] },
        },
      ],
    };
    expect(grade(test, outcome).passed).toBe(true);
    outcome.calls[0].input.settings[0].value = "50";
    expect(grade(test, outcome).passed).toBe(false);
  });
  it("rejects extra calls and does not accept failures as refusals", () => {
    const test = dataset[0];
    expect(
      grade(test, {
        status: "planned",
        reply: "",
        calls: [
          { tool: "codriver_help", input: {} },
          { tool: "skip_map", input: {} },
        ],
      }).passed,
    ).toBe(false);
    const refusal = dataset.find((test) => test.expected.kind === "refusal")!;
    expect(
      grade(refusal, { status: "failed", reply: "Offline", calls: [] }).passed,
    ).toBe(false);
  });
  it("plans against fixtures without preparing or running player operations", async () => {
    const test = dataset.find((test) => test.id === "players-kick")!;
    const model = {
      plan: vi
        .fn()
        .mockResolvedValue({
          calls: [{ name: "kick_player", input: { player: "Bob" } }],
          text: "",
          stopReason: "tool_use",
          usage: {
            model: "claude-haiku-5-5",
            inputTokens: 100,
            outputTokens: 10,
            cacheReadTokens: 0,
          },
        }),
    };
    const result = await evaluateCase(test, model, "claude-haiku-5-5");
    expect(result.passed).toBe(true);
    expect(result.costMicros).toBe(15);
    expect(model.plan.mock.calls[0][0].user).toContain("Winter 01");
  });
  it("evaluates exact commands without a model call", async () => {
    const model = { plan: vi.fn() };
    expect(
      (await evaluateCase(dataset[0], model, "claude-haiku-5-5")).passed,
    ).toBe(true);
    expect(model.plan).not.toHaveBeenCalled();
  });
});
