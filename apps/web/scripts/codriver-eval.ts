// Manual, paid model evaluation. No database or game operations are executed.
import { evalCaseSchema } from "@/lib/codriver/eval/grader";
import { evaluateCase } from "@/lib/codriver/eval/run";
import { CODRIVER_MODELS, createAnthropicModel } from "@/lib/codriver/model";
import { codriverTools } from "@/lib/codriver/registry";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { z } from "zod/v4";

const { values } = parseArgs({
  options: {
    model: { type: "string", default: "haiku" },
    effort: { type: "string", default: "low" },
    cases: { type: "string" },
    output: { type: "string" },
    filter: { type: "string" },
    "validate-only": { type: "boolean", default: false },
  },
});
if (
  !["haiku", "sonnet"].includes(values.model!) ||
  !["low", "medium"].includes(values.effort!)
)
  throw new Error("Use --model haiku|sonnet and --effort low|medium");
const source =
  values.cases ??
  new URL("../src/lib/codriver/eval/cases.json", import.meta.url);
const cases = z
  .array(evalCaseSchema)
  .min(1)
  .parse(JSON.parse(await readFile(source, "utf8")));
if (new Set(cases.map((test) => test.id)).size !== cases.length)
  throw new Error("Case IDs must be unique");
for (const test of cases)
  if (test.expected.kind === "calls")
    for (const call of test.expected.calls) {
      const tool = codriverTools.find((tool) => tool.name === call.tool);
      if (!tool) throw new Error(`${test.id}: unknown tool ${call.tool}`);
      tool.input.parse(call.input);
    }
if (values["validate-only"]) {
  console.log(`Validated ${cases.length} cases. No model calls made.`);
  process.exit(0);
}
const selected = cases.filter(
  (test) => !values.filter || test.id.includes(values.filter),
);
if (!selected.length) throw new Error("No cases match --filter");
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey)
  throw new Error(
    "Set ANTHROPIC_API_KEY to run paid evaluations, or use --validate-only",
  );
const modelName = CODRIVER_MODELS[values.model as keyof typeof CODRIVER_MODELS];
const model = createAnthropicModel(apiKey, values.effort as "low" | "medium");
const results = [];
for (const test of selected) {
  try {
    const result = await evaluateCase(test, model, modelName);
    results.push(result);
    console.log(
      `${result.passed ? "PASS" : "FAIL"} ${test.id}: ${result.reason} (${result.latencyMs} ms, $${(result.costMicros / 1_000_000).toFixed(6)})`,
    );
  } catch (error) {
    // Do not print SDK request details or headers, which can contain credentials.
    console.error(
      `${test.id}: evaluation stopped after a model or transport error. Completed results are retained.`,
    );
    if (values.output)
      await writeFile(
        values.output,
        JSON.stringify(
          {
            model: modelName,
            effort: values.effort,
            incomplete: true,
            results,
          },
          null,
          2,
        ),
      );
    process.exit(1);
  }
}
const passed = results.filter((result) => result.passed).length;
const totalCost = results.reduce((sum, result) => sum + result.costMicros, 0);
const latencies = results
  .map((result) => result.latencyMs)
  .sort((a, b) => a - b);
const summary = {
  model: modelName,
  effort: values.effort,
  cases: results.length,
  passed,
  accuracy: passed / results.length,
  costMicros: totalCost,
  meanLatencyMs: Math.round(
    latencies.reduce((a, b) => a + b, 0) / latencies.length,
  ),
  p95LatencyMs: latencies[Math.ceil(latencies.length * 0.95) - 1],
  fastPathCases: results.filter((result) => result.fastPath).length,
};
console.log(JSON.stringify(summary, null, 2));
if (values.output)
  await writeFile(values.output, JSON.stringify({ summary, results }, null, 2));
process.exit(passed === results.length ? 0 : 1);
