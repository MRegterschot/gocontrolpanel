import type { Actor } from "@/lib/actor";
import { getLogger } from "@/lib/logger";
import "server-only";
import { emitAction } from "./events";
import { parseFastPath } from "./fast-path";
import type { CodriverModel, ModelPlan, ModelUsage } from "./model";
import { modeKey, modeSettings } from "./modes";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { codriverTools } from "./registry";
import { resolveRole } from "./roles";
import { routeCategories } from "./router";
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

export const MAX_TEXT_LENGTH = 300;
export const MAX_CALLS = 3;

export interface CodriverRequest {
  serverId: string;
  actor: Actor;
  text: string;
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
    const categories = routeCategories(text);
    const offered = new Map(
      allowed
        .filter((tool) => categories.includes(tool.category))
        .map((tool) => [tool.name, tool]),
    );
    if (offered.size === 0) {
      return outcome("denied", "You don't have permission to do that.");
    }

    let state;
    try {
      state = await (options.getState ?? getLiveState)(request.serverId);
    } catch (error) {
      if (error instanceof CodriverError)
        return outcome("failed", error.message);
      throw error;
    }
    const user = buildUserMessage(text, {
      role,
      mode: modeKey(state.script),
      map: state.map?.name,
      players: state.players.length,
      settings: categories.includes("mode")
        ? modeSettings(state.script)?.map((setting) => setting.name)
        : undefined,
    });
    const apiTools = [...offered.values()].map(toApiTool);

    const models = [options.primaryModel, options.escalationModel].filter(
      (model): model is string => !!model,
    );
    let result: Validation = { error: "no model" };
    let lastText = "";
    for (const model of models) {
      const plan = await options.model.plan({
        model,
        system: SYSTEM_PROMPT,
        user,
        tools: apiTools,
      });
      usage.push(plan.usage);
      if (plan.stopReason === "refusal" || plan.stopReason === "max_tokens") {
        return outcome(
          "failed",
          "Codriver could not produce a complete plan. Try a shorter request.",
        );
      }
      lastText = plan.text;
      result = validate(plan, offered);
      if ("calls" in result) break;
      // A question back is a valid answer; don't pay for a second opinion
      if (
        plan.calls.length === 0 &&
        plan.text &&
        plan.stopReason === "end_turn"
      )
        break;
      log.warn({ model, error: result.error }, "Codriver plan rejected");
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
      `${prompts.join(" Then ")} Reply /co yes or /co no.`,
      calls,
      !!fast,
    );
  }

  const executed = await executeCalls(ctx, calls, tools);
  return { ...executed, usage, fastPath: !!fast };
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
