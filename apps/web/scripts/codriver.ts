// Runs a Codriver request from the terminal. Plans only unless --execute is given.
//   bun run codriver --server <id> --as <login> [--model haiku|sonnet] [--execute] [--yes] "<text>"
import { actorForLogin } from "@/lib/actor";
import { CODRIVER_MODELS, createAnthropicModel } from "@/lib/codriver/model";
import { resolveRole } from "@/lib/codriver/roles";
import { executeCalls, runCodriver } from "@/lib/codriver/runner";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    server: { type: "string" },
    as: { type: "string" },
    model: { type: "string", default: "haiku" },
    execute: { type: "boolean", default: false },
    yes: { type: "boolean", default: false },
  },
});

const text = positionals.join(" ");
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!values.server || !values.as || !text) {
  console.error(
    'Usage: bun run codriver --server <id> --as <login> [--model haiku|sonnet] [--execute] [--yes] "<text>"',
  );
  process.exit(1);
}
if (!apiKey) {
  console.error("Set ANTHROPIC_API_KEY.");
  process.exit(1);
}
if (values.model !== "haiku" && values.model !== "sonnet") {
  console.error("--model must be haiku or sonnet.");
  process.exit(1);
}

const actor = await actorForLogin(values.as);
const primaryModel = CODRIVER_MODELS[values.model];
const outcome = await runCodriver(
  { serverId: values.server, actor, text },
  {
    model: createAnthropicModel(apiKey),
    primaryModel,
    escalationModel: values.model === "haiku" ? CODRIVER_MODELS.sonnet : null,
    dryRun: !values.execute,
  },
);
console.log(JSON.stringify(outcome, null, 2));

if (outcome.status === "needs_confirmation" && values.yes) {
  const ctx = {
    serverId: values.server,
    actor,
    role: resolveRole(actor, values.server),
  };
  console.log(JSON.stringify(await executeCalls(ctx, outcome.calls), null, 2));
}
process.exit(0);
