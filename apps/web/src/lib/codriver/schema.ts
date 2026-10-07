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
