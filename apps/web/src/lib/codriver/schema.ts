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
// ...and at most this many optional parameters across their schemas, nested ones included
export const MAX_STRICT_OPTIONAL = 24;

// Properties an object schema doesn't require, counted through nested objects and arrays
export function countOptional(node: unknown): number {
  if (Array.isArray(node))
    return node.reduce((sum: number, item) => sum + countOptional(item), 0);
  if (!node || typeof node !== "object") return 0;
  const schema = node as Record<string, unknown>;
  let count = 0;
  if (schema.properties && typeof schema.properties === "object") {
    const required = new Set(
      Array.isArray(schema.required) ? schema.required : [],
    );
    count += Object.keys(schema.properties).filter(
      (name) => !required.has(name),
    ).length;
  }
  for (const [key, value] of Object.entries(schema)) {
    if (key === "properties" && value && typeof value === "object")
      count += countOptional(Object.values(value));
    else if (key !== "required") count += countOptional(value);
  }
  return count;
}

// Past either limit no tool stays strict; the runner still validates every call with zod
export function limitStrict(tools: Anthropic.Tool[]): Anthropic.Tool[] {
  const optional = tools.reduce(
    (sum, tool) => sum + countOptional(tool.input_schema),
    0,
  );
  if (tools.length <= MAX_STRICT_TOOLS && optional <= MAX_STRICT_OPTIONAL)
    return tools;
  return tools.map(({ strict: _strict, ...tool }) => tool);
}
