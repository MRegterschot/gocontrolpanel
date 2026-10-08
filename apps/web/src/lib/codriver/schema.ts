import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import type { CodriverTool } from "./types";

// Keywords strict tool use rejects; zod still enforces them when the call is validated
const unsupported = new Set([
  "$schema",
  "default",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
]);

function clean(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(clean);
  if (!node || typeof node !== "object") return node;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (unsupported.has(key)) continue;
    result[key] = key === "properties" ? cleanProperties(value) : clean(value);
  }
  if (result.type === "object") result.additionalProperties = false;
  return result;
}

function cleanProperties(properties: unknown): unknown {
  if (!properties || typeof properties !== "object") return properties;
  return Object.fromEntries(
    Object.entries(properties).map(([name, schema]) => [name, clean(schema)]),
  );
}

export function toApiTool(tool: CodriverTool): Anthropic.Tool {
  const schema = clean(z.toJSONSchema(tool.input, { io: "input" }));
  return {
    name: tool.name,
    description: tool.description,
    input_schema: schema as Anthropic.Tool.InputSchema,
    strict: true,
  };
}

// The API accepts at most this many strict tools in one request
export const MAX_STRICT_TOOLS = 20;

// Past the limit no tool stays strict; the runner still validates every call with zod
export function limitStrict(tools: Anthropic.Tool[]): Anthropic.Tool[] {
  if (tools.length <= MAX_STRICT_TOOLS) return tools;
  return tools.map(({ strict: _strict, ...tool }) => tool);
}
