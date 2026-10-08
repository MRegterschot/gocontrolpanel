import { actorForLogin } from "@/lib/actor";
import { getLogger } from "@/lib/logger";
import Anthropic from "@anthropic-ai/sdk";
import "server-only";
import { resolveAccess } from "./access";
import { notifyBudgetCrossings, notifyKeyRejected } from "./alerts";
import { parseFastPath } from "./fast-path";
import { type CodriverModel, createAnthropicModel } from "./model";
import {
  clearPending,
  savePending,
  takeCooldown,
  takePending,
} from "./pending";
import { resolveRole } from "./roles";
import { executeCalls, runCodriver } from "./runner";
import { loadAccessInput } from "./settings";
import { normalize } from "./text";
import {
  type BudgetState,
  budgetStates,
  isSpent,
  pruneRequests,
  recordRequest,
} from "./usage";

const confirmWords = new Set(["yes", "y", "confirm", "ok", "do it"]);
const cancelWords = new Set(["no", "n", "cancel", "stop"]);

export interface CodriverMessage {
  serverId: string;
  login: string;
  text: string;
  source: "game" | "panel" | "cli";
}

// Tests replace the model and the clock
export interface HandleDeps {
  createModel(apiKey: string): CodriverModel;
  now(): number;
  random(): number;
}

const defaultDeps: HandleDeps = {
  createModel: createAnthropicModel,
  now: Date.now,
  random: Math.random,
};

// One chat message to Codriver, from the game or the panel; returns the reply
export async function handleCodriverMessage(
  message: CodriverMessage,
  deps: HandleDeps = defaultDeps,
): Promise<string> {
  const { serverId, login, source } = message;
  const log = getLogger(serverId);
  const started = deps.now();

  try {
    const actor = await actorForLogin(login);
    const role = resolveRole(actor, serverId);
    const input = await loadAccessInput(serverId, actor, role);
    const access = resolveAccess(input);
    if (!access.allowed) return access.reason;

    const record = (
      status: Parameters<typeof recordRequest>[0]["status"],
      calls: Parameters<typeof recordRequest>[0]["calls"],
      usage: Parameters<typeof recordRequest>[0]["usage"] = [],
    ) =>
      recordRequest({
        serverId,
        userId: actor.userId,
        login,
        source,
        text: message.text,
        calls,
        status,
        keySource: usage.length > 0 ? access.keySource : "none",
        usage,
        latencyMs: deps.now() - started,
      });

    const word = normalize(message.text);
    if (confirmWords.has(word)) {
      const calls = await takePending(serverId, login);
      if (!calls) return "Nothing to confirm.";
      // Runs with the caller's current role, which executeCalls checks per call
      const executed = await executeCalls({ serverId, actor, role }, calls);
      await record(executed.status, calls);
      return executed.reply;
    }
    if (cancelWords.has(word)) {
      return (await clearPending(serverId, login))
        ? "Cancelled."
        : "Nothing to cancel.";
    }

    if (!(await takeCooldown(serverId, login, access.cooldownSeconds))) {
      return "One moment, Codriver is still catching up.";
    }
    // A new request replaces an unanswered question
    await clearPending(serverId, login);

    // Exact commands cost nothing, so they keep working when a budget is spent
    let budgets: BudgetState[] = [];
    if (!parseFastPath(message.text)) {
      budgets = await budgetStates(serverId, access.budgets);
      if (budgets.some(isSpent)) {
        await record("over_budget", []);
        return "Codriver has used its budget for this month.";
      }
    }

    let outcome;
    try {
      outcome = await runCodriver(
        { serverId, actor, text: message.text },
        {
          model: deps.createModel(access.apiKey),
          primaryModel: access.primaryModel,
          escalationModel: access.escalationModel,
        },
      );
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        await notifyKeyRejected(serverId, access.keySource);
      }
      throw error;
    }
    if (outcome.status === "needs_confirmation") {
      await savePending(serverId, login, outcome.calls);
    }
    const cost = await record(outcome.status, outcome.calls, outcome.usage);
    await notifyBudgetCrossings(serverId, budgets, cost);

    // About one request in a hundred also clears old history
    if (deps.random() < 0.01) await pruneRequests(input.retentionDays);

    return outcome.reply;
  } catch (error) {
    log.error({ error, login }, "Codriver request failed");
    return "Codriver is unavailable right now.";
  }
}
