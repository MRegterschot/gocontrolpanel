import Anthropic from "@anthropic-ai/sdk";
import "server-only";

export const CODRIVER_MODELS = {
  haiku: "claude-haiku-5-5",
  sonnet: "claude-sonnet-5-5",
} as const;

export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
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
}

// The runner depends on this interface so tests and evals can swap the model
export interface CodriverModel {
  plan(request: PlanRequest): Promise<ModelPlan>;
}

export function createAnthropicModel(apiKey: string): CodriverModel {
  const client = new Anthropic({ apiKey, timeout: 15_000, maxRetries: 1 });

  return {
    async plan({ model, system, user, tools }) {
      const response = await client.messages.create({
        model,
        // Thinking counts towards this; low effort keeps it short
        max_tokens: 1024,
        output_config: { effort: "low" },
        system,
        tools,
        tool_choice: { type: "auto" },
        messages: [{ role: "user", content: user }],
      });

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
