import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

const mocks = vi.hoisted(() => ({
  liveState: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dbclient", () => ({ getClient: () => ({}) }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
  getLogger: () => ({ info: mocks.info, warn: mocks.warn, error: vi.fn() }),
}));
vi.mock("@/lib/codriver/registry", () => ({ codriverTools: [] }));
vi.mock("@/lib/codriver/state", () => ({ getLiveState: mocks.liveState }));
vi.mock("@/lib/codriver/events", () => ({ emitAction: vi.fn() }));

import type { Actor } from "@/lib/actor";
import { askJev, wantsJevFastPath } from "@/lib/codriver/jev";
import {
  type CodriverModel,
  createJevClassifier,
  JEV_MODEL,
  type JevAnswer,
  type JevClassifier,
  type ModelPlan,
} from "@/lib/codriver/model";
import { runCodriver } from "@/lib/codriver/runner";
import { defineTool } from "@/lib/codriver/types";
import { costMicros } from "@/lib/codriver/usage";
import { sessionClaimsSchema } from "@tmcontrolpanel/shared";

const serverId = "server-a";

function actorWithRole(role: "Admin" | "Moderator" | "Member"): Actor {
  return {
    userId: "user-1",
    login: "login-1",
    displayName: "Player One",
    claims: sessionClaimsSchema.parse({
      id: "user-1",
      admin: false,
      servers: [{ id: serverId, name: "A", role }],
    }),
  };
}

function plan(calls: ModelPlan["calls"], text = ""): ModelPlan {
  return {
    calls,
    text,
    stopReason: calls.length ? "tool_use" : "end_turn",
    usage: {
      model: "m",
      inputTokens: 100,
      outputTokens: 10,
      cacheReadTokens: 0,
    },
  };
}

function fakeModel(
  ...plans: ModelPlan[]
): CodriverModel & { plan: ReturnType<typeof vi.fn> } {
  const fn = vi.fn();
  for (const p of plans) fn.mockResolvedValueOnce(p);
  return { plan: fn };
}

const jevUsage = {
  model: JEV_MODEL,
  inputTokens: 300,
  outputTokens: 20,
  cacheReadTokens: 0,
};

function fakeJev(answers: Record<string, JevAnswer>) {
  const decide = vi.fn().mockResolvedValue({ answers, usage: jevUsage });
  return { decide } satisfies JevClassifier;
}

const command = (choice: string, probability: number): JevAnswer => ({
  type: "choice",
  choice,
  probabilities: { [choice]: probability },
  confidence: probability,
});
const noul = (value: number): JevAnswer => ({ type: "noul", noul: value });

const run = vi.fn();
const tool = (
  name: string,
  category: "maps" | "mode" | "server" | "info",
  input: z.ZodType = z.strictObject({}),
) =>
  defineTool({
    readOnly: true,
    name,
    description: name,
    category,
    minRole: "moderator",
    input,
    run,
  });
const tools = [
  tool("skip_map", "maps"),
  tool("set_points", "mode", z.strictObject({ points: z.number() })),
  tool("announce", "server", z.strictObject({ message: z.string() })),
  tool("get_server_state", "info"),
];

function options(model: CodriverModel, classifier?: JevClassifier) {
  return {
    model,
    primaryModel: "primary",
    escalationModel: null,
    tools,
    classifier,
    compose: false,
  };
}

const ask = (text: string, model: CodriverModel, classifier?: JevClassifier) =>
  runCodriver(
    { serverId, actor: actorWithRole("Moderator"), text },
    options(model, classifier),
  );

const offered = (model: { plan: ReturnType<typeof vi.fn> }, call = 0) =>
  model.plan.mock.calls[call][0].tools.map((t: { name: string }) => t.name);

beforeEach(() => {
  mocks.liveState.mockResolvedValue({
    script: "Trackmania/TM_Cup_Online.Script.txt",
    nextScript: "Trackmania/TM_Cup_Online.Script.txt",
    map: { uid: "u", name: "Winter 01", author: "a", fileName: "f" },
    players: [],
  });
  run.mockResolvedValue({ reply: "Done." });
});

describe("Jev fast path", () => {
  it("runs a confident reworded command without the planner", async () => {
    const model = fakeModel();
    const jev = fakeJev({
      command: command("skip_map", 0.97),
      explicit: noul(0.95),
    });
    const outcome = await ask("can we go to another one", model, jev);
    expect(outcome).toMatchObject({ status: "done", fastPath: true });
    expect(outcome.calls).toEqual([{ tool: "skip_map", input: {} }]);
    expect(outcome.usage).toEqual([
      { ...jevUsage, jevOutcome: "fast_explicit" },
    ]);
    expect(model.plan).not.toHaveBeenCalled();
  });

  it("still checks the caller's role", async () => {
    const model = fakeModel();
    const jev = fakeJev({ command: command("skip_map", 0.97) });
    const outcome = await runCodriver(
      { serverId, actor: actorWithRole("Member"), text: "next one please" },
      options(model, jev),
    );
    expect(outcome.status).toBe("denied");
    expect(run).not.toHaveBeenCalled();
  });

  it.each([
    ["below the threshold", command("skip_map", 0.8)],
    ["for other", command("other", 0.99)],
  ])("plans normally %s", async (_, answer) => {
    const model = fakeModel(plan([{ name: "skip_map", input: {} }]));
    const outcome = await ask(
      "skip this one",
      model,
      fakeJev({ command: answer }),
    );
    expect(outcome.fastPath).toBe(false);
    expect(model.plan).toHaveBeenCalledTimes(1);
    expect(outcome.usage.map((u) => u.model)).toEqual([JEV_MODEL, "m"]);
    expect(outcome.usage[0].jevOutcome).toBe("passed");
  });

  it("is not asked about long or multi-part requests", () => {
    expect(wantsJevFastPath("skip it and restart")).toBe(false);
    expect(wantsJevFastPath("skip then pause")).toBe(false);
    expect(
      wantsJevFastPath("please could you go ahead and find me a nice snow map"),
    ).toBe(false);
    expect(wantsJevFastPath("next one please")).toBe(true);
  });

  it("skips Jev entirely for a long request with a keyword route", async () => {
    const model = fakeModel(
      plan([{ name: "set_points", input: { points: 5 } }]),
    );
    const jev = fakeJev({});
    await ask(
      "set the points limit to five for every round from now on",
      model,
      jev,
    );
    expect(jev.decide).not.toHaveBeenCalled();
  });

  it("only asks the fast-path question when the keywords found a route", async () => {
    const jev = fakeJev({ command: command("other", 0.9) });
    await ask(
      "skip please",
      fakeModel(plan([{ name: "skip_map", input: {} }])),
      jev,
    );
    // No route questions, since the keywords already found a route
    expect(Object.keys(jev.decide.mock.calls[0][1])).toEqual([
      "command",
      "explicit",
    ]);
  });
});

describe("Jev explicit orders", () => {
  const skipTool = defineTool({
    name: "skip_map",
    description: "Skip",
    category: "maps",
    minRole: "moderator",
    immediateWhenExplicit: true,
    input: z.strictObject({}),
    confirm: () => null,
    run,
  });
  const askSkip = (explicit: number) =>
    runCodriver(
      {
        serverId,
        actor: actorWithRole("Moderator"),
        text: "can we go to another one",
      },
      {
        ...options(
          fakeModel(),
          fakeJev({
            command: command("skip_map", 0.97),
            explicit: noul(explicit),
          }),
        ),
        tools: [skipTool],
      },
    );

  it("runs a reworded order at once", async () => {
    expect(await askSkip(0.95)).toMatchObject({ status: "done" });
  });

  it("still asks when the request is a question or a wish", async () => {
    const outcome = await askSkip(0.3);
    expect(outcome).toMatchObject({
      status: "needs_confirmation",
      fastPath: true,
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("asks the explicit question together with the command question", async () => {
    const jev = fakeJev({ command: command("other", 0.9) });
    await askJev(jev, "skip please", { route: false, fast: true });
    expect(Object.keys(jev.decide.mock.calls[0][1])).toEqual([
      "command",
      "explicit",
    ]);
  });
});

describe("Jev fallback routing", () => {
  const routed = (scores: Record<string, number>) =>
    fakeJev(
      Object.fromEntries(
        Object.entries(scores).map(([category, value]) => [
          `route_${category}`,
          noul(value),
        ]),
      ),
    );

  it("offers the categories Jev is confident about", async () => {
    const model = fakeModel(
      plan([{ name: "announce", input: { message: "hi" } }]),
    );
    const jev = routed({ server: 0.9, maps: 0.1, info: 0.3 });
    const outcome = await ask("yo shout hi", model, jev);
    expect(outcome.status).toBe("done");
    expect(offered(model)).toEqual(["announce"]);
  });

  it("treats a Jev route as real, so a question back is not retried wide", async () => {
    const model = fakeModel(plan([], "What should I shout?"));
    const outcome = await ask("yo shout", model, routed({ server: 0.9 }));
    expect(outcome.status).toBe("unclear");
    expect(model.plan).toHaveBeenCalledTimes(1);
  });

  it("keeps the guessed route when no category passes", async () => {
    const model = fakeModel(
      plan([], "What should I shout?"),
      plan([{ name: "announce", input: { message: "hi" } }]),
    );
    const outcome = await ask("yo shout hi", model, routed({ server: 0.2 }));
    expect(outcome.status).toBe("done");
    expect(offered(model, 0)).not.toContain("announce");
    expect(offered(model, 1)).toContain("announce");
  });

  it("falls back to keyword routing when Jev fails", async () => {
    const model = fakeModel(
      plan([], "What should I shout?"),
      plan([{ name: "announce", input: { message: "hi" } }]),
    );
    const jev = { decide: vi.fn().mockRejectedValue(new Error("timeout")) };
    const outcome = await ask("yo shout hi", model, jev);
    expect(outcome.status).toBe("done");
    // The planner's two calls, plus a zero-cost entry that records the failed Jev call
    expect(outcome.usage.map((u) => u.jevOutcome)).toEqual([
      "failed",
      undefined,
      undefined,
    ]);
    expect(mocks.warn).toHaveBeenCalled();
  });
});

describe("askJev", () => {
  it("asks nothing when neither question is wanted", async () => {
    const jev = fakeJev({});
    expect(
      await askJev(jev, "hi", { route: false, fast: false }),
    ).toMatchObject({ categories: null, fast: null, usage: null });
    expect(jev.decide).not.toHaveBeenCalled();
  });

  it("fixes the argument of pause and unpause", async () => {
    const jev = fakeJev({ command: command("unpause", 0.95) });
    const decision = await askJev(jev, "lets go again", {
      route: false,
      fast: true,
    });
    expect(decision.fast).toEqual({
      tool: "pause_match",
      input: { paused: false },
    });
  });

  it("ignores an option Jev made up", async () => {
    const jev = fakeJev({ command: command("ban_everyone", 0.99) });
    const decision = await askJev(jev, "x", { route: false, fast: true });
    expect(decision.fast).toBeNull();
  });
});

describe("createJevClassifier", () => {
  it("posts the questions and reads answers and usage", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: JEV_MODEL,
          answers: { q: { type: "noul", noul: 0.7 } },
          usage: { input_tokens: 42, output_tokens: 3 },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await createJevClassifier("key").decide("state", {
      q: { type: "noul", instructions: "Yes?" },
    });
    expect(result).toEqual({
      answers: { q: { type: "noul", noul: 0.7 } },
      usage: {
        model: JEV_MODEL,
        inputTokens: 42,
        outputTokens: 3,
        cacheReadTokens: 0,
      },
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(init.headers.Authorization).toBe("Bearer key");
    expect(JSON.parse(init.body)).toEqual({
      state: "state",
      model: JEV_MODEL,
      questions: { q: { type: "noul", instructions: "Yes?" } },
    });
    vi.unstubAllGlobals();
  });

  it("throws on an error status so the caller falls back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 529 })),
    );
    await expect(createJevClassifier("key").decide("s", {})).rejects.toThrow(
      "529",
    );
    vi.unstubAllGlobals();
  });
});

describe("Jev cost", () => {
  it("charges input tokens only", () => {
    expect(
      costMicros([{ ...jevUsage, inputTokens: 1_000_000, outputTokens: 500 }]),
    ).toBe(42_000);
  });
});
