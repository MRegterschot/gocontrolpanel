import { type Actor, actorForLogin } from "@/lib/actor";
import { getLogger } from "@/lib/logger";
import type { CodriverChatReply } from "@/types/codriver";
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
  confirmationId?: string;
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
export async function handleCodriverRequest(
  message: CodriverMessage,
  deps: HandleDeps = defaultDeps,
  authenticatedActor?: Actor,
): Promise<CodriverChatReply> {
  const { serverId, login, source } = message;
  const log = getLogger(serverId);
  const started = deps.now();

  try {
    const actor = authenticatedActor ?? (await actorForLogin(login));
    const role = resolveRole(actor, serverId);
    const input = await loadAccessInput(serverId, actor, role);
    const access = resolveAccess(input);
    if (!access.allowed) return { status: "denied", reply: access.reason };

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
      if (source === "panel" && !message.confirmationId)
        return {
          status: "unclear",
          reply: "Use Confirm on the request you want to execute.",
        };
      const calls = await takePending(
        serverId,
        login,
        source,
        message.confirmationId,
      );
      if (!calls) return { status: "unclear", reply: "Nothing to confirm." };
      // Runs with the caller's current role, which executeCalls checks per call
      const executed = await executeCalls({ serverId, actor, role }, calls);
      await record(executed.status, calls);
      return { status: executed.status, reply: executed.reply };
    }
    if (cancelWords.has(word)) {
      return {
        status: "done",
        reply: (await clearPending(serverId, login, source))
          ? "Cancelled."
          : "Nothing to cancel.",
      };
    }

    if (!(await takeCooldown(serverId, login, access.cooldownSeconds))) {
      return {
        status: "cooldown",
        reply: "One moment, Codriver is still catching up.",
      };
    }
    // A new request replaces an unanswered question
    await clearPending(serverId, login, source);

    // Exact commands cost nothing, so they keep working when a budget is spent
    let budgets: BudgetState[] = [];
    if (!parseFastPath(message.text)) {
      budgets = await budgetStates(serverId, access.budgets);
      if (budgets.some(isSpent)) {
        await record("over_budget", []);
        return {
          status: "over_budget",
          reply: "Codriver has used its budget for this month.",
        };
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
      await record("failed", []);
      throw error;
    }
    const confirmationId =
      outcome.status === "needs_confirmation"
        ? await savePending(serverId, login, outcome.calls, source)
        : undefined;
    const cost = await record(outcome.status, outcome.calls, outcome.usage);
    await notifyBudgetCrossings(serverId, budgets, cost);

    // About one request in a hundred also clears old history
    if (deps.random() < 0.01) await pruneRequests(input.retentionDays);

    return {
      status: outcome.status,
      reply: outcome.reply,
      ...(confirmationId ? { confirmationId } : {}),
    };
  } catch (error) {
    log.error({ error, login }, "Codriver request failed");
    return { status: "failed", reply: "Codriver is unavailable right now." };
  }
}

// The game transport only needs a chat line; panel chat also uses the status for confirmation controls.
export async function handleCodriverMessage(
  message: CodriverMessage,
  deps: HandleDeps = defaultDeps,
): Promise<string> {
  return (await handleCodriverRequest(message, deps)).reply;
}
