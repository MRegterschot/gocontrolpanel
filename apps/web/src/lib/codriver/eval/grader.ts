import { z } from "zod/v4";
import { coerceSetting, resolveSetting, scriptForMode } from "../modes";
import type { CodriverOutcome } from "../runner";
import { normalize } from "../text";
import type { PlannedCall } from "../types";

const call = z.strictObject({
  tool: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
});
export const evalCaseSchema = z.strictObject({
  id: z.string().min(1),
  text: z.string().min(1).max(300),
  role: z.enum(["guest", "member", "moderator", "admin"]),
  state: z.strictObject({
    mode: z.string().refine((mode) => !!scriptForMode(mode), "Unknown mode"),
    map: z.string(),
    players: z.number().int().min(0),
  }),
  expected: z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("calls"),
      calls: z.array(call).min(1).max(3),
    }),
    z.strictObject({ kind: z.literal("refusal") }),
    z.strictObject({ kind: z.literal("clarification") }),
  ]),
});
export type EvalCase = z.infer<typeof evalCaseSchema>;

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, canonical(value)]),
    );
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
}

export function normalizeCall(call: PlannedCall, mode: string): unknown {
  const input = { ...(call.input as Record<string, unknown>) };
  if (call.tool === "set_mode" && typeof input.mode === "string")
    input.mode = input.mode.toLowerCase();
  if (
    ["set_mode", "set_mode_settings"].includes(call.tool) &&
    Array.isArray(input.settings)
  ) {
    const script = scriptForMode(
      call.tool === "set_mode" ? String(input.mode) : mode,
    )!;
    input.settings = input.settings
      .map((entry: { name: string; value: string | number | boolean }) => {
        const setting = resolveSetting(script, entry.name);
        return {
          name: setting.name,
          value: coerceSetting(setting, entry.value),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  for (const key of ["player", "query", "who", "plugin", "author"]) {
    if (typeof input[key] === "string") input[key] = normalize(input[key]);
  }
  if (Array.isArray(input.tags))
    input.tags = input.tags.map((tag) => normalize(String(tag))).sort();
  return canonical({ tool: call.tool, input });
}

export function grade(
  test: EvalCase,
  actual: Pick<CodriverOutcome, "status" | "calls" | "reply">,
): { passed: boolean; reason: string } {
  if (test.expected.kind !== "calls") {
    const refused =
      actual.status === "denied" ||
      (actual.status === "unclear" &&
        actual.calls.length === 0 &&
        !!actual.reply);
    // The planner represents both a safe refusal and a clarification as a short no-tool reply.
    const passed =
      test.expected.kind === "refusal"
        ? refused
        : actual.status === "unclear" &&
          actual.calls.length === 0 &&
          !!actual.reply;
    return {
      passed,
      reason: passed
        ? "No operation planned"
        : `Expected ${test.expected.kind}, got ${actual.status}`,
    };
  }
  if (actual.status !== "planned")
    return { passed: false, reason: `Expected a plan, got ${actual.status}` };
  try {
    const expected = test.expected.calls.map((call) =>
      normalizeCall(call, test.state.mode),
    );
    const observed = actual.calls.map((call) =>
      normalizeCall(call, test.state.mode),
    );
    const passed = JSON.stringify(expected) === JSON.stringify(observed);
    return {
      passed,
      reason: passed
        ? "Exact normalized match"
        : `Expected ${JSON.stringify(expected)}; got ${JSON.stringify(observed)}`,
    };
  } catch {
    return {
      passed: false,
      reason: "Arguments could not be normalized for this mode",
    };
  }
}
