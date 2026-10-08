import type { Actor } from "@/lib/actor";
import { getLogger } from "@/lib/logger";
import type { CodriverProgress } from "@gcp/shared";
import "server-only";
import { looksIncomplete, missedAreas } from "./completeness";
import type { Turn } from "./conversation";
import { emitAction } from "./events";
import { parseFastPath } from "./fast-path";
import type { CodriverModel, ModelPlan, ModelUsage } from "./model";
import { modeKey, modeSettings } from "./modes";
import { notify, type ProgressListener, runningProgress } from "./progress";
import {
  buildComposeMessage,
  buildUserMessage,
  COMPOSE_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
} from "./prompt";
import { codriverTools } from "./registry";
import { resolveRole } from "./roles";
import { everyCategory, routeRequest } from "./router";
import { toApiTool } from "./schema";
import { getLiveState } from "./state";
import { chatSafe } from "./text";
import {
  CodriverError,
  type CodriverTool,
  hasRole,
  type PlannedCall,
  type ToolContext,
} from "./types";

async function defaultTmxTags(): Promise<string[]> {
  // Loaded on demand so requests that never touch TMX don't pull the client in
  const { getTMXTags } = await import("@/lib/api/tmx");
  return (await getTMXTags()).map((tag) => tag.Name);
}

export const MAX_TEXT_LENGTH = 300;
export const MAX_CALLS = 3;

export interface CodriverRequest {
  serverId: string;
  actor: Actor;
  text: string;
  // Earlier turns with this player, oldest first
  history?: Turn[];
  // Told when a slow stage starts; failures here must never affect the request
  onProgress?: ProgressListener;
}

export interface CodriverOptions {
  model: CodriverModel;
  primaryModel: string;
  // Retried once when the primary model's answer can't be used; null to turn off
  escalationModel: string | null;
  // Plan without running anything
  dryRun?: boolean;
  // Evaluation supplies fixtures without connecting to a dedicated server
  getState?: typeof getLiveState;
  // Overrides the registry, for tests
  tools?: CodriverTool[];
  // Trackmania Exchange tag names for the prompt; defaults to the cached TMX list
  getTmxTags?: () => Promise<string[]>;
}

export type CodriverStatus =
  | "done"
  | "needs_confirmation"
  | "planned"
  | "unclear"
  | "denied"
  | "failed";

export interface CodriverOutcome {
  status: CodriverStatus;
  reply: string;
  // Validated calls; for needs_confirmation, what runs after the caller confirms
  calls: PlannedCall[];
  usage: ModelUsage[];
  fastPath: boolean;
}

type Validation = { calls: PlannedCall[] } | { error: string };

function validate(
  plan: ModelPlan,
  offered: Map<string, CodriverTool>,
): Validation {
  if (plan.calls.length === 0) return { error: "no tool call" };
  if (plan.calls.length > MAX_CALLS) return { error: "too many tool calls" };

  const calls: PlannedCall[] = [];
  for (const call of plan.calls) {
    const tool = offered.get(call.name);
    if (!tool) return { error: `tool ${call.name} was not offered` };
    const parsed = tool.input.safeParse(call.input);
    if (!parsed.success) return { error: `invalid input for ${call.name}` };
    calls.push({ tool: call.name, input: parsed.data });
  }
  return { calls };
}

export async function runCodriver(
  request: CodriverRequest,
  options: CodriverOptions,
): Promise<CodriverOutcome> {
  const log = getLogger(request.serverId);
  const tools = options.tools ?? codriverTools;
  const usage: ModelUsage[] = [];
  const text = request.text.trim();
  const role = resolveRole(request.actor, request.serverId);
  const ctx: ToolContext = {
    serverId: request.serverId,
    actor: request.actor,
    role,
  };
  const allowed = tools.filter((tool) => hasRole(role, tool.minRole));

  const progress = (update: CodriverProgress) =>
    notify(request.onProgress, update);

  const outcome = (
    status: CodriverStatus,
    reply: string,
    calls: PlannedCall[] = [],
    fastPath = false,
  ): CodriverOutcome => ({ status, reply, calls, usage, fastPath });

  if (!text)
    return outcome("unclear", "Ask me something, for example /co help.");
  if (text.length > MAX_TEXT_LENGTH) {
    return outcome("unclear", `Keep it under ${MAX_TEXT_LENGTH} characters.`);
  }
  if (allowed.length === 0) {
    return outcome(
      "denied",
      "You don't have access to Codriver on this server.",
    );
  }

  // Exact commands skip the model but get the same checks
  const fast = parseFastPath(text);
  let calls: PlannedCall[];
  // What the model said it could not do, shown next to the result
  let note = "";
  if (fast) {
    const tool = tools.find((t) => t.name === fast.tool);
    if (!tool || !hasRole(role, tool.minRole)) {
      return outcome(
        "denied",
        "You don't have permission to do that.",
        [],
        true,
      );
    }
    const parsed = tool.input.safeParse(fast.input);
    if (!parsed.success)
      return outcome(
        "unclear",
        "That request has invalid arguments. Try a shorter request.",
        [],
        true,
      );
    calls = [{ tool: fast.tool, input: parsed.data }];
  } else {
    const route = routeRequest(text);
    const categories = route.categories;
    const offeredFor = (wanted: readonly string[]) =>
      new Map(
        allowed
          .filter((tool) => wanted.includes(tool.category))
          .map((tool) => [tool.name, tool]),
      );
    const wide = offeredFor(everyCategory);
    if (wide.size === 0) {
      return outcome("denied", "You don't have permission to do that.");
    }
    const narrow = offeredFor(categories);

    let state;
    try {
      state = await (options.getState ?? getLiveState)(request.serverId);
    } catch (error) {
      if (error instanceof CodriverError)
        return outcome("failed", error.message);
      throw error;
    }
    // Tags let the model aim a TMX search at a style instead of guessing a map name
    let tmxTags: string[] | undefined;
    if (narrow.has("add_tmx_map") || narrow.has("add_tmx_mappack")) {
      try {
        tmxTags = await (options.getTmxTags ?? defaultTmxTags)();
      } catch (error) {
        log.warn({ err: error }, "Codriver could not load the TMX tags");
      }
    }
    const userFor = (check?: string) =>
      buildUserMessage(
        text,
        {
          role,
          mode: modeKey(state.script),
          map: state.map?.name,
          players: state.players.length,
          settings: categories.includes("mode")
            ? modeSettings(state.script)?.map((setting) => setting.name)
            : undefined,
          tmxTags,
        },
        request.history,
        check,
      );
    const user = userFor();

    const models = [options.primaryModel, options.escalationModel].filter(
      (model): model is string => !!model,
    );
    // A guessed route gets a second try with every tool before giving up
    const attempts = models.map((model, index) => ({
      model,
      offered:
        (index > 0 && route.fallback) || narrow.size === 0 ? wide : narrow,
    }));
    if (route.fallback && attempts.length === 1 && narrow.size > 0) {
      attempts.push({ model: attempts[0].model, offered: wide });
    }
    let result: Validation = { error: "no model" };
    let lastText = "";
    let offered = narrow;
    // A valid plan that probably lost a part of the request; used if the retry is no better
    let held: { calls: PlannedCall[]; text: string } | null = null;
    // Set once a plan looked incomplete, so the next attempt knows what to cover
    let check: string | undefined;
    for (let index = 0; index < attempts.length; index++) {
      const { model, offered: attemptOffered } = attempts[index];
      offered = attemptOffered;
      progress(
        index === 0
          ? { stage: "planning", text: "Working out what to do…" }
          : { stage: "escalating", text: "Thinking harder…" },
      );
      const modelStarted = performance.now();
      const plan = await options.model.plan({
        model,
        system: SYSTEM_PROMPT,
        user: check ? userFor(check) : user,
        tools: [...offered.values()].map(toApiTool),
      });
      usage.push(plan.usage);
      log.info(
        { model, modelMs: Math.round(performance.now() - modelStarted) },
        "Codriver model call",
      );
      if (plan.stopReason === "refusal" || plan.stopReason === "max_tokens") {
        return outcome(
          "failed",
          "Codriver could not produce a complete plan. Try a shorter request.",
        );
      }
      lastText = plan.text;
      result = validate(plan, offered);
      if ("calls" in result) {
        if (
          !route.fallback &&
          looksIncomplete(
            text,
            categories,
            result.calls,
            plan.text,
            (tool) => offered.get(tool)?.category,
          )
        ) {
          // With only one model, try it again with a hint about what was left out
          if (attempts.length === 1) attempts.push({ model, offered });
          if (index < attempts.length - 1) {
            held = { calls: result.calls, text: plan.text };
            const missing = missedAreas(
              text,
              categories,
              result.calls,
              (tool) => offered.get(tool)?.category,
            );
            check = missing.length
              ? `Your previous plan did not cover: ${missing.join(", ")}. If the request asks for something there, call the matching tool too, with every setting mentioned.`
              : "Your previous plan may have skipped part of the request. Check every part and setting.";
            log.info(
              { model, missing },
              "Codriver plan may have skipped part of the request",
            );
            result = { error: "possibly incomplete" };
            continue;
          }
        }
        break;
      }
      // A question back is a valid answer; don't pay for a second opinion. After a
      // guessed route it may only mean the right tool wasn't offered.
      if (
        plan.calls.length === 0 &&
        plan.text &&
        plan.stopReason === "end_turn" &&
        !(route.fallback && offered !== wide)
      )
        break;
      log.warn({ model, error: result.error }, "Codriver plan rejected");
    }

    if ("error" in result && held) {
      result = { calls: held.calls };
      lastText = held.text;
    }
    if ("error" in result) {
      return outcome(
        "unclear",
        lastText
          ? chatSafe(lastText, 250)
          : "I didn't understand that. Try /co help.",
      );
    }
    calls = result.calls;
    if (lastText) note = ` Note: ${chatSafe(lastText, 200)}`;
    else if (
      !route.fallback &&
      looksIncomplete(
        text,
        categories,
        calls,
        "",
        (tool) => wide.get(tool)?.category,
      )
    ) {
      // The retries didn't fix it, so say so rather than let a part vanish
      const missing = missedAreas(
        text,
        categories,
        calls,
        (tool) => wide.get(tool)?.category,
      );
      if (missing.length > 0)
        note = ` Note: I may have skipped the ${missing.join("/")} part, ask again if so.`;
    }
  }

  if (options.dryRun) {
    return outcome("planned", describeCalls(calls), calls, !!fast);
  }

  try {
    calls = await Promise.all(
      calls.map(async (call) => {
        const tool = tools.find((t) => t.name === call.tool)!;
        const input = tool.input.parse(call.input);
        return {
          tool: call.tool,
          input: tool.input.parse((await tool.prepare?.(ctx, input)) ?? input),
        };
      }),
    );
  } catch (error) {
    if (error instanceof CodriverError)
      return outcome("unclear", error.message, [], !!fast);
    log.error({ error }, "Codriver preparation failed");
    return outcome(
      "failed",
      "Something went wrong, check the panel logs.",
      [],
      !!fast,
    );
  }

  // Confirmation is asked for the whole request when any call needs it
  const prompts: string[] = [];
  try {
    for (const call of calls) {
      const tool = tools.find((t) => t.name === call.tool)!;
      const prompt = await tool.confirm?.(ctx, call.input);
      if (prompt) prompts.push(prompt);
    }
  } catch (error) {
    if (error instanceof CodriverError)
      return outcome("unclear", error.message, [], !!fast);
    log.error({ error }, "Codriver confirmation failed");
    return outcome(
      "failed",
      "Something went wrong, check the panel logs.",
      [],
      !!fast,
    );
  }
  if (prompts.length > 0) {
    return outcome(
      "needs_confirmation",
      `${prompts.join(" Then ")}${note} Reply /co yes or /co no.`,
      calls,
      !!fast,
    );
  }

  progress(runningProgress(calls));
  const toolsStarted = performance.now();
  const executed = await executeCalls(ctx, calls, tools);
  log.info(
    { toolsMs: Math.round(performance.now() - toolsStarted), fast: !!fast },
    "Codriver tools ran",
  );
  let reply = `${executed.reply}${note}`;
  // Exact commands stay free, and answers to info tools are the data itself
  const acted = calls.some(
    (call) => tools.find((t) => t.name === call.tool)?.category !== "info",
  );
  if (
    options.model.compose &&
    !fast &&
    acted &&
    (executed.status === "done" || executed.status === "failed")
  ) {
    const composeStarted = performance.now();
    try {
      const composed = await options.model.compose({
        model: options.primaryModel,
        system: COMPOSE_SYSTEM_PROMPT,
        user: buildComposeMessage(text, executed.status, reply),
      });
      usage.push(composed.usage);
      const friendly = chatSafe(composed.text, 250);
      if (friendly) reply = friendly;
      log.info(
        { composeMs: Math.round(performance.now() - composeStarted) },
        "Codriver reply composed",
      );
    } catch (error) {
      // The templated reply is already correct
      log.warn({ err: error }, "Codriver could not compose a reply");
    }
  }
  return { ...executed, reply, usage, fastPath: !!fast };
}

function describeCalls(calls: PlannedCall[]): string {
  return calls
    .map((call) => `${call.tool} ${JSON.stringify(call.input)}`)
    .join("; ");
}

// Runs validated calls in order and stops at the first failure
export async function executeCalls(
  ctx: ToolContext,
  calls: PlannedCall[],
  tools: CodriverTool[] = codriverTools,
): Promise<Pick<CodriverOutcome, "status" | "reply" | "calls">> {
  const log = getLogger(ctx.serverId);
  const replies: string[] = [];

  for (const call of calls) {
    const tool = tools.find((t) => t.name === call.tool);
    // Checked again: a confirmed call may run after the caller's role changed
    if (!tool || !hasRole(ctx.role, tool.minRole)) {
      return {
        status: "denied",
        reply: "You don't have permission to do that.",
        calls,
      };
    }
    try {
      const input = tool.input.parse(call.input);
      const result = await tool.run(ctx, input);
      replies.push(result.reply);
      if (tool.category !== "info" && result.changed !== false)
        await emitAction(ctx, call.tool, input);
    } catch (error) {
      if (error instanceof CodriverError) {
        replies.push(error.message);
      } else {
        log.error({ error, tool: call.tool }, "Codriver tool failed");
        replies.push("Something went wrong, check the panel logs.");
      }
      return { status: "failed", reply: replies.join(" "), calls };
    }
  }

  return { status: "done", reply: replies.join(" "), calls };
}
