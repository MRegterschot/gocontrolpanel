import { z } from "zod";

// The config form of a third-party plugin is a small JSON Schema subset: a flat object of
// strings, numbers, booleans and lists. The panel renders a form from it, the web app
// validates on save and the GBX service validates again on load. `pattern` is left out on
// purpose: the schema comes from the plugin, so its regex must never run on the server.

const PROPERTY_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const MAX_PROPERTIES = 50;
const MAX_STRING = 10_000;

const text = (max: number) => z.string().max(max);

const common = {
  title: text(80).optional(),
  description: text(300).optional(),
};

const stringField = z
  .object({
    type: z.literal("string"),
    ...common,
    default: text(MAX_STRING).optional(),
    enum: z.array(text(200)).min(1).max(100).optional(),
    minLength: z.number().int().min(0).max(MAX_STRING).optional(),
    maxLength: z.number().int().min(1).max(MAX_STRING).optional(),
    // Write-only in the panel and left out of exports (API keys)
    secret: z.boolean().optional(),
    multiline: z.boolean().optional(),
  })
  .strict();

const numberField = z
  .object({
    type: z.enum(["number", "integer"]),
    ...common,
    default: z.number().finite().optional(),
    minimum: z.number().finite().optional(),
    maximum: z.number().finite().optional(),
  })
  .strict();

const booleanField = z
  .object({
    type: z.literal("boolean"),
    ...common,
    default: z.boolean().optional(),
  })
  .strict();

const arrayItems = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("string"),
      enum: z.array(text(200)).min(1).max(100).optional(),
      maxLength: z.number().int().min(1).max(MAX_STRING).optional(),
    })
    .strict(),
  z
    .object({
      type: z.enum(["number", "integer"]),
      minimum: z.number().finite().optional(),
      maximum: z.number().finite().optional(),
    })
    .strict(),
]);

const arrayField = z
  .object({
    type: z.literal("array"),
    ...common,
    items: arrayItems,
    default: z.array(z.union([text(MAX_STRING), z.number().finite()])).max(500).optional(),
    minItems: z.number().int().min(0).max(500).optional(),
    maxItems: z.number().int().min(1).max(500).optional(),
  })
  .strict();

export const configFieldSchema = z.union([stringField, numberField, booleanField, arrayField]);
export type ConfigField = z.infer<typeof configFieldSchema>;

export const pluginConfigSchemaSchema = z
  .object({
    type: z.literal("object"),
    properties: z
      .record(configFieldSchema)
      .refine((props) => Object.keys(props).length <= MAX_PROPERTIES, {
        message: `At most ${MAX_PROPERTIES} properties`,
      })
      .refine((props) => Object.keys(props).every((key) => PROPERTY_NAME.test(key)), {
        message: "Property names must start with a letter and use letters, digits or _",
      }),
    required: z.array(z.string()).max(MAX_PROPERTIES).optional(),
  })
  .strict()
  .superRefine((schema, ctx) => {
    for (const key of schema.required ?? []) {
      if (!(key in schema.properties)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["required"],
          message: `Required property "${key}" is not defined`,
        });
      }
    }
    // A default the form could never save is a mistake in the plugin
    for (const [key, field] of Object.entries(schema.properties)) {
      if (field.default === undefined) continue;
      const issue = checkValue(field, field.default);
      if (issue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["properties", key, "default"],
          message: issue,
        });
      }
    }
  });

export type PluginConfigSchema = z.infer<typeof pluginConfigSchemaSchema>;
export type PluginConfig = Record<string, unknown>;

export interface ConfigIssue {
  path: string;
  message: string;
}

export type ConfigValidation =
  | { success: true; data: PluginConfig }
  | { success: false; issues: ConfigIssue[] };

function checkNumber(
  field: { type: "number" | "integer"; minimum?: number; maximum?: number },
  value: unknown,
): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Must be a number";
  if (field.type === "integer" && !Number.isInteger(value)) return "Must be a whole number";
  if (field.minimum !== undefined && value < field.minimum) {
    return `Must be at least ${field.minimum}`;
  }
  if (field.maximum !== undefined && value > field.maximum) {
    return `Must be at most ${field.maximum}`;
  }
  return null;
}

function checkString(
  field: { enum?: string[]; minLength?: number; maxLength?: number },
  value: unknown,
): string | null {
  if (typeof value !== "string") return "Must be text";
  if (value.length > (field.maxLength ?? MAX_STRING)) {
    return `Must be at most ${field.maxLength ?? MAX_STRING} characters`;
  }
  if (field.minLength !== undefined && value.length < field.minLength) {
    return `Must be at least ${field.minLength} characters`;
  }
  if (field.enum && !field.enum.includes(value)) return "Not one of the allowed values";
  return null;
}

// Returns a message when the value doesn't fit the field
function checkValue(field: ConfigField, value: unknown): string | null {
  switch (field.type) {
    case "string":
      return checkString(field, value);
    case "number":
    case "integer":
      return checkNumber(field, value);
    case "boolean":
      return typeof value === "boolean" ? null : "Must be true or false";
    case "array": {
      if (!Array.isArray(value)) return "Must be a list";
      if (field.maxItems !== undefined && value.length > field.maxItems) {
        return `At most ${field.maxItems} items`;
      }
      if (field.minItems !== undefined && value.length < field.minItems) {
        return `At least ${field.minItems} items`;
      }
      for (const item of value) {
        const issue =
          field.items.type === "string"
            ? checkString(field.items, item)
            : checkNumber(field.items, item);
        if (issue) return `Item: ${issue}`;
      }
      return null;
    }
  }
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

// Strict check used when an admin saves a config. Unknown keys are dropped and defaults
// fill in what is missing.
export function validatePluginConfig(
  schema: PluginConfigSchema,
  input: unknown,
): ConfigValidation {
  const raw = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const values = raw as Record<string, unknown>;
  const required = new Set(schema.required ?? []);
  const issues: ConfigIssue[] = [];
  const data: PluginConfig = {};

  for (const [key, field] of Object.entries(schema.properties)) {
    const value = isEmpty(values[key]) ? field.default : values[key];
    if (isEmpty(value)) {
      if (required.has(key)) issues.push({ path: key, message: "Required" });
      continue;
    }
    const issue = checkValue(field, value);
    if (issue) issues.push({ path: key, message: issue });
    else data[key] = value;
  }

  return issues.length > 0 ? { success: false, issues } : { success: true, data };
}

// Lenient read used by the GBX service: a stored config that no longer fits (a plugin
// update changed the schema) falls back to the defaults field by field instead of failing.
export function coercePluginConfig(
  schema: PluginConfigSchema,
  input: unknown,
): { data: PluginConfig; issues: ConfigIssue[] } {
  const raw = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const values = raw as Record<string, unknown>;
  const issues: ConfigIssue[] = [];
  const data: PluginConfig = {};

  for (const [key, field] of Object.entries(schema.properties)) {
    const value = values[key];
    if (!isEmpty(value)) {
      const issue = checkValue(field, value);
      if (!issue) {
        data[key] = value;
        continue;
      }
      issues.push({ path: key, message: issue });
    }
    if (field.default !== undefined) data[key] = field.default;
  }

  return { data, issues };
}

export function defaultPluginConfig(schema: PluginConfigSchema): PluginConfig {
  return coercePluginConfig(schema, {}).data;
}

export function secretKeys(schema: PluginConfigSchema): string[] {
  return Object.entries(schema.properties)
    .filter(([, field]) => field.type === "string" && field.secret)
    .map(([key]) => key);
}

// What the panel may show: secrets are replaced by whether they are set
export function maskSecrets(
  schema: PluginConfigSchema,
  config: PluginConfig,
): { config: PluginConfig; setSecrets: string[] } {
  const masked: PluginConfig = { ...config };
  const setSecrets: string[] = [];
  for (const key of secretKeys(schema)) {
    if (!isEmpty(masked[key])) setSecrets.push(key);
    delete masked[key];
  }
  return { config: masked, setSecrets };
}

// A secret left empty in the form keeps its stored value; `cleared` removes it
export function mergeSecrets(
  schema: PluginConfigSchema,
  previous: PluginConfig,
  next: PluginConfig,
  cleared: readonly string[] = [],
): PluginConfig {
  const merged: PluginConfig = { ...next };
  for (const key of secretKeys(schema)) {
    if (cleared.includes(key)) delete merged[key];
    else if (isEmpty(merged[key]) && !isEmpty(previous[key])) merged[key] = previous[key];
  }
  return merged;
}
