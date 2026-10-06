import { z } from "zod";

// Declarative forms travel in the installed plugin manifest. No plugin JavaScript
// runs in the panel: it only renders this bounded, validated schema.
const PROPERTY_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const MAX_PROPERTIES = 50;
const MAX_STRING = 10_000;
const text = (max: number) => z.string().max(max);
const common = {
  title: text(80).optional(),
  description: text(300).optional(),
  visibleWhen: z
    .object({
      property: text(64),
      equals: z.union([z.string().max(200), z.boolean()]),
    })
    .strict()
    .optional(),
};
const stringField = z
  .object({
    type: z.literal("string"),
    ...common,
    default: text(MAX_STRING).optional(),
    enum: z.array(text(200)).min(1).max(100).optional(),
    minLength: z.number().int().min(0).max(MAX_STRING).optional(),
    maxLength: z.number().int().min(1).max(MAX_STRING).optional(),
    secret: z.boolean().optional(),
    multiline: z.boolean().optional(),
    widget: z.enum(["user", "map", "script", "order"]).optional(),
    format: z.literal("underscore-pair").optional(),
    maxItemsFrom: text(200).optional(),
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
type Common =
  z.infer<typeof booleanField> extends infer B
    ? Omit<B, "type" | "default">
    : never;
export type ConfigField =
  | z.infer<typeof stringField>
  | z.infer<typeof numberField>
  | z.infer<typeof booleanField>
  | (Common & {
      type: "array";
      items: ConfigField;
      default?: unknown[];
      minItems?: number;
      maxItems?: number;
      addLabel?: string;
      defaultFrom?: "current-user";
      csv?: {
        columns: Record<string, string>;
        lists?: Record<string, string[]>;
        seed?: string;
      };
    })
  | (Common & {
      type: "object";
      properties: Record<string, ConfigField>;
      required?: string[];
    });
const properties = () =>
  z
    .record(configFieldSchema)
    .refine(
      (props) => Object.keys(props).length <= MAX_PROPERTIES,
      `At most ${MAX_PROPERTIES} properties`,
    )
    .refine(
      (props) => Object.keys(props).every((key) => PROPERTY_NAME.test(key)),
      "Invalid property name",
    );
export const configFieldSchema: z.ZodType<ConfigField> = z.lazy(() =>
  z.union([
    stringField,
    numberField,
    booleanField,
    z
      .object({
        type: z.literal("object"),
        ...common,
        properties: properties(),
        required: z.array(text(64)).max(MAX_PROPERTIES).optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("array"),
        ...common,
        items: configFieldSchema,
        default: z.array(z.unknown()).max(500).optional(),
        minItems: z.number().int().min(0).max(500).optional(),
        maxItems: z.number().int().min(1).max(500).optional(),
        addLabel: text(80).optional(),
        defaultFrom: z.literal("current-user").optional(),
        csv: z
          .object({
            columns: z.record(text(80)),
            lists: z.record(z.array(text(80)).max(50)).optional(),
            seed: text(64).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
  ]),
);

// Check depth before recursive parsing so untrusted packages cannot overflow the stack.
const boundedSchema = z.unknown().superRefine((raw, ctx) => {
  let count = 0;
  function visit(value: unknown, depth: number): boolean {
    if (++count > 10_000 || depth > 20) return false;
    if (!value || typeof value !== "object") return true;
    return Object.values(value).every((child) => visit(child, depth + 1));
  }
  if (!visit(raw, 0))
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Config schema is too large or deeply nested",
    });
});
export const pluginConfigSchemaSchema = boundedSchema
  .pipe(
    z
      .object({
        type: z.literal("object"),
        properties: properties(),
        required: z.array(text(64)).max(MAX_PROPERTIES).optional(),
        tabs: z
          .array(
            z
              .object({
                id: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/),
                title: text(80).min(1),
                properties: z.array(text(64)).min(1).max(MAX_PROPERTIES),
              })
              .strict(),
          )
          .min(1)
          .max(10)
          .optional(),
      })
      .strict(),
  )
  .superRefine((schema, ctx) => {
    if (schema.tabs) {
      const ids = schema.tabs.map((tab) => tab.id);
      const keys = schema.tabs.flatMap((tab) => tab.properties);
      if (
        new Set(ids).size !== ids.length ||
        new Set(keys).size !== keys.length ||
        keys.some((key) => !(key in schema.properties)) ||
        Object.keys(schema.properties).some((key) => !keys.includes(key))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tabs"],
          message:
            "Tabs must have unique IDs and include each property exactly once",
        });
      }
    }
    function visit(
      field: ConfigField,
      path: (string | number)[],
      depth: number,
    ) {
      if (depth > 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: "At most five nested fields",
        });
        return;
      }
      if (field.type === "object") {
        for (const key of field.required ?? [])
          if (!(key in field.properties))
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path,
              message: `Required property "${key}" is not defined`,
            });
        for (const [key, child] of Object.entries(field.properties))
          visit(child, [...path, "properties", key], depth + 1);
      } else if (field.type === "array")
        visit(field.items, [...path, "items"], depth + 1);
      else if (field.type === "string" && field.secret && depth > 1)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: "Secrets must be top-level fields",
        });
      if ("default" in field && field.default !== undefined) {
        const issue = checkValue(field, field.default);
        if (issue)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "default"],
            message: issue,
          });
      }
    }
    visit(schema, [], 0);
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
  if (typeof value !== "number" || !Number.isFinite(value))
    return "Must be a number";
  if (field.type === "integer" && !Number.isInteger(value))
    return "Must be a whole number";
  if (field.minimum !== undefined && value < field.minimum) {
    return `Must be at least ${field.minimum}`;
  }
  if (field.maximum !== undefined && value > field.maximum) {
    return `Must be at most ${field.maximum}`;
  }
  return null;
}

function checkString(
  field: {
    enum?: string[];
    minLength?: number;
    maxLength?: number;
    widget?: string;
    format?: string;
  },
  value: unknown,
): string | null {
  if (typeof value !== "string") return "Must be text";
  if (value.length > (field.maxLength ?? MAX_STRING)) {
    return `Must be at most ${field.maxLength ?? MAX_STRING} characters`;
  }
  if (field.minLength !== undefined && value.length < field.minLength) {
    return `Must be at least ${field.minLength} characters`;
  }
  if (field.enum && !field.enum.includes(value))
    return "Not one of the allowed values";
  if (
    "widget" in field &&
    field.widget === "order" &&
    value &&
    !/^(?:[pb]:[1-9][0-9]*|r)(?:,(?:[pb]:[1-9][0-9]*|r))*$/.test(value)
  )
    return "Invalid pick and ban order";
  if (
    "format" in field &&
    field.format === "underscore-pair" &&
    value.split("_").length !== 2
  )
    return "Must contain one underscore";
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
    case "object": {
      const checked = validatePluginConfig(field, value);
      return checked.success
        ? null
        : checked.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; ");
    }
    case "array": {
      if (!Array.isArray(value)) return "Must be a list";
      if (field.maxItems !== undefined && value.length > field.maxItems) {
        return `At most ${field.maxItems} items`;
      }
      if (field.minItems !== undefined && value.length < field.minItems) {
        return `At least ${field.minItems} items`;
      }
      if (value.length > 500) return "At most 500 items";
      for (const [index, item] of value.entries()) {
        const issue = checkValue(field.items, item);
        if (issue) return `Item ${index + 1}: ${issue}`;
      }
      return null;
    }
  }
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

// Strict save validation recursively drops unknown keys and applies defaults.
export function validatePluginConfig(
  schema: PluginConfigSchema,
  input: unknown,
  root?: PluginConfig,
): ConfigValidation {
  const issues: ConfigIssue[] = [];
  const rootValues =
    root ?? (input && typeof input === "object" ? (input as PluginConfig) : {});
  function validate(
    field: ConfigField,
    raw: unknown,
    path: string,
    required: boolean,
  ): unknown {
    const value = isEmpty(raw)
      ? "default" in field
        ? field.default
        : undefined
      : raw;
    if (isEmpty(value)) {
      if (required)
        issues.push({
          path,
          message:
            field.type === "string" && field.widget === "user"
              ? "Search for a user and select a result"
              : "Required",
        });
      return undefined;
    }
    if (field.type === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        issues.push({ path, message: "Must be an object" });
        return undefined;
      }
      const data: PluginConfig = {};
      for (const [key, child] of Object.entries(field.properties)) {
        const next = validate(
          child,
          (value as PluginConfig)[key],
          path ? `${path}.${key}` : key,
          field.required?.includes(key) ?? false,
        );
        if (next !== undefined) data[key] = next;
      }
      return data;
    }
    if (field.type === "array") {
      if (!Array.isArray(value)) {
        issues.push({ path, message: "Must be a list" });
        return undefined;
      }
      if (value.length > (field.maxItems ?? 500))
        issues.push({
          path,
          message: `At most ${field.maxItems ?? 500} items`,
        });
      if (value.length < (field.minItems ?? 0))
        issues.push({ path, message: `At least ${field.minItems} items` });
      return value
        .slice(0, 500)
        .map((item, index) =>
          validate(field.items, item, `${path}.${index}`, true),
        );
    }
    const issue = checkValue(field, value);
    if (issue) issues.push({ path, message: issue });
    if (
      field.type === "string" &&
      field.maxItemsFrom &&
      typeof value === "string"
    ) {
      const list = field.maxItemsFrom
        .split(".")
        .reduce<unknown>(
          (current, key) =>
            current && typeof current === "object"
              ? (current as PluginConfig)[key]
              : undefined,
          rootValues,
        );
      if (value.split(",").length > (Array.isArray(list) ? list.length : 0))
        issues.push({
          path,
          message: "The number of steps cannot exceed the number of maps",
        });
    }
    return value;
  }
  const data = validate(schema, input, "", true) as PluginConfig;
  return issues.length
    ? { success: false, issues }
    : { success: true, data: data ?? {} };
}

// Lenient read used by the GBX service: a stored config that no longer fits (a plugin
// update changed the schema) falls back to the defaults field by field instead of failing.
export function coercePluginConfig(
  schema: PluginConfigSchema,
  input: unknown,
): { data: PluginConfig; issues: ConfigIssue[] } {
  const raw =
    input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const values = raw as Record<string, unknown>;
  const issues: ConfigIssue[] = [];
  const data: PluginConfig = {};

  function numericText(field: ConfigField, value: unknown): unknown {
    if (
      (field.type === "number" || field.type === "integer") &&
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    )
      return Number(value);
    if (
      field.type === "object" &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    )
      return Object.fromEntries(
        Object.entries(field.properties).map(([key, child]) => [
          key,
          numericText(child, (value as PluginConfig)[key]),
        ]),
      );
    if (field.type === "array" && Array.isArray(value))
      return value.slice(0, 501).map((item) => numericText(field.items, item));
    return value;
  }
  for (const [key, field] of Object.entries(schema.properties)) {
    const value = numericText(field, values[key]);
    if (!isEmpty(value)) {
      const result = validatePluginConfig(
        { type: "object", properties: { [key]: field } },
        { [key]: value },
        values,
      );
      const issue = result.success
        ? null
        : result.issues.map((issue) => issue.message).join("; ");
      if (result.success) {
        data[key] = result.data[key];
        continue;
      }
      issues.push({ path: key, message: issue! });
    }
    if ("default" in field && field.default !== undefined)
      data[key] = field.default;
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
    else if (isEmpty(merged[key]) && !isEmpty(previous[key]))
      merged[key] = previous[key];
  }
  return merged;
}

// Older panels only understand scalar fields and scalar arrays. Keep richer
// packages out of their registry choices instead of offering unusable updates.
export function configSchemaNeedsSdk2(schema: PluginConfigSchema): boolean {
  if (schema.tabs) return true;
  function rich(field: ConfigField): boolean {
    if (field.visibleWhen) return true;
    if (field.type === "object") return true;
    if (field.type === "array") {
      const allowed =
        field.items.type === "string"
          ? ["type", "enum", "maxLength"]
          : ["type", "minimum", "maximum"];
      return (
        !!(field.addLabel || field.defaultFrom || field.csv) ||
        !["string", "number", "integer"].includes(field.items.type) ||
        Object.keys(field.items).some((key) => !allowed.includes(key))
      );
    }
    return (
      field.type === "string" &&
      !!(field.widget || field.format || field.maxItemsFrom)
    );
  }
  return Object.values(schema.properties).some(rich);
}
