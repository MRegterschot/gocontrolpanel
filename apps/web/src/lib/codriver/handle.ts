import { actorForLogin } from "@/lib/actor";
import { getLogger } from "@/lib/logger";
import "server-only";
import { checkAccess } from "./access";
import { type CodriverModel, createAnthropicModel } from "./model";
import {
  clearPending,
  savePending,
  takeCooldown,
  takePending,
} from "./pending";
import { resolveRole } from "./roles";
import { executeCalls, runCodriver } from "./runner";
import { normalize } from "./text";

export const COOLDOWN_SECONDS = 3;

const confirmWords = new Set(["yes", "y", "confirm", "ok", "do it"]);
const cancelWords = new Set(["no", "n", "cancel", "stop"]);

export interface CodriverMessage {
  serverId: string;
  login: string;
  text: string;
}

// Tests replace the model
export interface HandleDeps {
  createModel(apiKey: string): CodriverModel;
}

const defaultDeps: HandleDeps = { createModel: createAnthropicModel };

// One chat message to Codriver, from the game or the panel; returns the reply
export async function handleCodriverMessage(
  message: CodriverMessage,
  deps: HandleDeps = defaultDeps,
): Promise<string> {
  const { serverId, login } = message;
  const log = getLogger(serverId);

  try {
    const actor = await actorForLogin(login);
    const role = resolveRole(actor, serverId);
    const access = checkAccess(role);
    if (!access.allowed) return access.reason;

    const word = normalize(message.text);
    if (confirmWords.has(word)) {
      const calls = await takePending(serverId, login);
      if (!calls) return "Nothing to confirm.";
      // Runs with the caller's current role, which executeCalls checks per call
      const executed = await executeCalls({ serverId, actor, role }, calls);
      log.info(
        { login, status: executed.status, calls },
        "Codriver confirmed request",
      );
      return executed.reply;
    }
    if (cancelWords.has(word)) {
      return (await clearPending(serverId, login))
        ? "Cancelled."
        : "Nothing to cancel.";
    }

    if (!(await takeCooldown(serverId, login, COOLDOWN_SECONDS))) {
      return "One moment, Codriver is still catching up.";
    }
    // A new request replaces an unanswered question
    await clearPending(serverId, login);

    const outcome = await runCodriver(
      { serverId, actor, text: message.text },
      {
        model: deps.createModel(access.apiKey),
        primaryModel: access.primaryModel,
        escalationModel: access.escalationModel,
      },
    );
    if (outcome.status === "needs_confirmation") {
      await savePending(serverId, login, outcome.calls);
    }

    log.info(
      {
        login,
        status: outcome.status,
        tools: outcome.calls.map((call) => call.tool),
        fastPath: outcome.fastPath,
        usage: outcome.usage,
      },
      "Codriver request",
    );
    return outcome.reply;
  } catch (error) {
    log.error({ error, login }, "Codriver request failed");
    return "Codriver is unavailable right now.";
  }
}
