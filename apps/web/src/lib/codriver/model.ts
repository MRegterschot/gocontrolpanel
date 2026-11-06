import Anthropic from "@anthropic-ai/sdk";
import "server-only";
import { limitStrict } from "./schema";

export const CODRIVER_MODELS = {
  haiku: "claude-haiku-5-5",
  sonnet: "claude-sonnet-5-5",
} as const;

// What a Jev call changed for the request; "failed" is a call that errored or timed out
export type JevOutcome =
  | "fast_explicit"
  | "fast"
  | "routed"
  | "passed"
  | "failed";

export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  // Jev entries only
  jevOutcome?: JevOutcome;
}

export interface ModelPlan {
  calls: { name: string; input: unknown }[];
  // Text the model wrote instead of, or next to, tool calls
  text: string;
  stopReason: string | null;
  usage: ModelUsage;
}

export interface PlanRequest {
  model: string;
  system: string;
  user: string;
  tools: Anthropic.Tool[];
  // Aborts the call when the player cancels
  signal?: AbortSignal;
}

export interface ComposeRequest {
  model: string;
  system: string;
  user: string;
}

export interface ComposeResult {
  text: string;
  usage: ModelUsage;
}

// The runner depends on this interface so tests and evals can swap the model
export interface CodriverModel {
  plan(request: PlanRequest): Promise<ModelPlan>;
  // Words the outcome for the player; models without it keep the templated reply
  compose?(request: ComposeRequest): Promise<ComposeResult>;
}

export const JEV_MODEL = "jev-1.13.0";
const JEV_URL = "https://api.typesafe.ai/v1";

export type JevQuestion =
  | {
      type: "noul";
      instructions: string;
      criteria?: { true?: string; false?: string };
    }
  | { type: "choice"; instructions: string; criteria: Record<string, string> };

export type JevAnswer =
  | { type: "noul"; noul: number }
  | {
      type: "choice";
      choice: string;
      probabilities: Record<string, number>;
      confidence: number;
    };

export interface JevResult {
  answers: Record<string, JevAnswer>;
  usage: ModelUsage;
}

// TypeSafe's Jev answers typed questions about a text; optional, and swapped out in tests
export interface JevClassifier {
  decide(
    state: string,
    questions: Record<string, JevQuestion>,
    signal?: AbortSignal,
  ): Promise<JevResult>;
}

// Jev only runs before planning, so it gets a short timeout and no retries; callers fall back on errors
export function createJevClassifier(
  apiKey: string,
  timeoutMs = 1_500,
): JevClassifier {
  return {
    async decide(state, questions, signal) {
      const response = await fetch(`${JEV_URL}/systemone`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        // Pinned rather than jev-latest, since thresholds are tuned to one version
        body: JSON.stringify({ state, model: JEV_MODEL, questions }),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
          : AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        throw new Error(`Jev returned HTTP ${response.status}`);
      }
      const body = (await response.json()) as {
        answers?: Record<string, JevAnswer>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      if (!body.answers) throw new Error("Jev returned no answers");
      return {
        answers: body.answers,
        usage: {
          model: JEV_MODEL,
          inputTokens: body.usage?.input_tokens ?? 0,
          outputTokens: body.usage?.output_tokens ?? 0,
          cacheReadTokens: 0,
        },
      };
    },
  };
}

// A model listing is free and proves the key works
export async function verifyJevKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const response = await fetch(`${JEV_URL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { ok: true };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: "The TypeSafe key was rejected." };
    }
  } catch {
    // Reported below
  }
  return {
    ok: false,
    reason: "The key could not be checked, try again later.",
  };
}

export function createAnthropicModel(
  apiKey: string,
  effort: "low" | "medium" = "low",
): CodriverModel {
  const client = new Anthropic({ apiKey, timeout: 15_000, maxRetries: 1 });

  return {
    async plan({ model, system, user, tools, signal }) {
      const response = await client.messages.create(
        {
          model,
          // Thinking counts towards this; low effort keeps it short
          max_tokens: 1024,
          output_config: { effort },
          system,
          tools: limitStrict(tools),
          tool_choice: { type: "auto" },
          messages: [{ role: "user", content: user }],
        },
        { signal },
      );

      const usage: ModelUsage = {
        model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      };

      // Calls from a refused or truncated response can be incomplete
      const complete =
        response.stop_reason !== "refusal" &&
        response.stop_reason !== "max_tokens";

      return {
        calls: complete
          ? response.content
              .filter(
                (block): block is Anthropic.ToolUseBlock =>
                  block.type === "tool_use",
              )
              .map((block) => ({ name: block.name, input: block.input }))
          : [],
        text: response.content
          .filter(
            (block): block is Anthropic.TextBlock => block.type === "text",
          )
          .map((block) => block.text)
          .join(" ")
          .trim(),
        stopReason: response.stop_reason,
        usage,
      };
    },

    // A short call, so it gets less time than planning and is never retried
    async compose({ model, system, user }) {
      const response = await client.messages.create(
        {
          model,
          max_tokens: 300,
          output_config: { effort: "low" },
          system,
          messages: [{ role: "user", content: user }],
        },
        { timeout: 6_000, maxRetries: 0 },
      );
      return {
        text: response.content
          .filter(
            (block): block is Anthropic.TextBlock => block.type === "text",
          )
          .map((block) => block.text)
          .join(" ")
          .trim(),
        usage: {
          model,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        },
      };
    },
  };
}

// Checks a key before it is stored. A model lookup is free and proves the key can use Codriver.
export async function verifyApiKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const client = new Anthropic({ apiKey, timeout: 10_000, maxRetries: 0 });
  try {
    await client.models.retrieve(CODRIVER_MODELS.haiku);
    return { ok: true };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, reason: "The API key was rejected." };
    }
    if (
      error instanceof Anthropic.PermissionDeniedError ||
      error instanceof Anthropic.NotFoundError
    ) {
      return {
        ok: false,
        reason: "The API key can't use the Codriver models.",
      };
    }
    return {
      ok: false,
      reason: "The key could not be checked, try again later.",
    };
  }
}
