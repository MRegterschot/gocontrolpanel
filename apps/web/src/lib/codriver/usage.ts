import { getClient } from "@/lib/dbclient";
import { getLogger } from "@/lib/logger";
import type { Prisma } from "@tmcontrolpanel/db";
import "server-only";
import type { Budget, BudgetScope } from "./access";
import { CODRIVER_MODELS, JEV_MODEL, type ModelUsage } from "./model";
import type { PlannedCall } from "./types";

// Dollars per million tokens, which is the same number as micro-dollars per token.
// Haiku's price is for prompts under 100K tokens; Codriver prompts stay far below that.
const prices: Record<
  string,
  { input: number; output: number; cacheRead: number }
> = {
  [CODRIVER_MODELS.haiku]: { input: 0.1, output: 0.5, cacheRead: 0.01 },
  [CODRIVER_MODELS.sonnet]: { input: 2, output: 10, cacheRead: 0.2 },
  // Jev only charges for input
  [JEV_MODEL]: { input: 0.042, output: 0, cacheRead: 0 },
};

// Jev classifies before planning; it counts towards cost but not towards model calls
const isPlanner = (call: ModelUsage) => call.model !== JEV_MODEL;

// The most telling outcome when several Jev calls ran, as in a request split into steps
const jevOutcomeOrder = ["fast_explicit", "fast", "routed", "failed", "passed"];

function jevSummary(usage: ModelUsage[]) {
  const calls = usage.filter((call) => !isPlanner(call));
  const outcome = jevOutcomeOrder.find((candidate) =>
    calls.some((call) => call.jevOutcome === candidate),
  );
  return {
    jevOutcome: outcome ?? null,
    jevInputTokens: outcome
      ? calls.reduce((sum, call) => sum + call.inputTokens, 0)
      : null,
  };
}

export function costMicros(usage: ModelUsage[]): number {
  return Math.round(
    usage.reduce((total, call) => {
      const price = prices[call.model];
      if (!price) return total;
      return (
        total +
        call.inputTokens * price.input +
        call.outputTokens * price.output +
        call.cacheReadTokens * price.cacheRead
      );
    }, 0),
  );
}

// A Codriver prompt (instructions, tools, history) stays well under this
const MAX_PROMPT_TOKENS = 30_000;
const MAX_OUTPUT_TOKENS = 1024;

// Worst-case cost of one model call, for budget reservations
export function maxCallMicros(model: string): number {
  const price = prices[model] ?? prices[CODRIVER_MODELS.sonnet];
  return Math.ceil(
    MAX_PROMPT_TOKENS * price.input + MAX_OUTPUT_TOKENS * price.output,
  );
}

export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function scopeFilter(
  scope: BudgetScope,
  serverId: string,
): Prisma.CodriverRequestsWhereInput {
  switch (scope) {
    case "server-key":
      return { serverId, keySource: "server" };
    case "shared-server":
      return { serverId, keySource: "shared" };
    case "shared-global":
      return { keySource: "shared" };
  }
}

export async function spentMicros(
  scope: BudgetScope,
  serverId: string,
): Promise<number> {
  const result = await getClient().codriverRequests.aggregate({
    where: {
      ...scopeFilter(scope, serverId),
      createdAt: { gte: monthStart() },
    },
    _sum: { costMicros: true },
  });
  return result._sum.costMicros ?? 0;
}

export interface BudgetState {
  budget: Budget;
  spentMicros: number;
}

export async function budgetStates(
  serverId: string,
  budgets: Budget[],
): Promise<BudgetState[]> {
  return Promise.all(
    budgets.map(async (budget) => ({
      budget,
      spentMicros: await spentMicros(budget.scope, serverId),
    })),
  );
}

// 1 cent is 10,000 micro-dollars
export const isSpent = (state: BudgetState) =>
  state.spentMicros >= state.budget.limitCents * 10_000;

export interface RequestRecord {
  serverId: string;
  userId: string | null;
  login: string;
  source: "game" | "panel" | "cli";
  text: string;
  // What the player was told
  reply?: string;
  calls: PlannedCall[];
  status:
    | "done"
    | "needs_confirmation"
    | "planned"
    | "unclear"
    | "denied"
    | "failed"
    | "over_budget"
    | "cancelled";
  keySource: "server" | "shared" | "none";
  usage: ModelUsage[];
  latencyMs: number;
}

export async function recordRequest(record: RequestRecord): Promise<number> {
  const cost = costMicros(record.usage);
  const planner = record.usage.filter(isPlanner);
  const last = planner.at(-1);
  await getClient().codriverRequests.create({
    data: {
      serverId: record.serverId,
      userId: record.userId,
      login: record.login,
      source: record.source,
      text: record.text.slice(0, 1000),
      reply: record.reply?.slice(0, 1000) ?? null,
      toolCalls: record.calls as unknown as Prisma.InputJsonValue,
      status: record.status,
      keySource: record.keySource,
      model: last?.model ?? null,
      modelCalls: planner.length,
      inputTokens: planner.reduce((sum, call) => sum + call.inputTokens, 0),
      outputTokens: planner.reduce((sum, call) => sum + call.outputTokens, 0),
      cacheReadTokens: planner.reduce(
        (sum, call) => sum + call.cacheReadTokens,
        0,
      ),
      ...jevSummary(record.usage),
      costMicros: cost,
      latencyMs: record.latencyMs,
    },
  });
  return cost;
}

// Removes history older than the operator's retention, but never this month's: budgets add up
// this month's requests, so pruning them would hand the spend back
export function pruneCutoff(retentionDays: number, now = new Date()): Date {
  const byRetention = new Date(now.getTime() - retentionDays * 86_400_000);
  const month = monthStart(now);
  return byRetention < month ? byRetention : month;
}

export async function pruneRequests(retentionDays: number): Promise<void> {
  try {
    await getClient().codriverRequests.deleteMany({
      where: { createdAt: { lt: pruneCutoff(retentionDays) } },
    });
  } catch (error) {
    getLogger("codriver").warn({ error }, "Pruning Codriver history failed");
  }
}
