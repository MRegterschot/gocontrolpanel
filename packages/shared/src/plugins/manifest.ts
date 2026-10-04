import { z } from "zod";
import { GAME_MODE_TYPES } from "../types/live";
import { isCapability, isHttpCapability } from "./capabilities";
import { pluginConfigSchemaSchema } from "./config-schema";
import { isValidVersion } from "./version";

// The manifest every plugin package carries as tmcp-plugin.json

export const MANIFEST_FILE = "tmcp-plugin.json";

// Names of the plugins compiled into the GBX service
export const BUILTIN_PLUGIN_NAMES = [
  "ta-leaderboard",
  "map-info",
  "records-info",
  "ta-active-runs",
  "live-ranking",
  "live-round",
  "admin",
  "ecm",
  "player-info",
  "match",
] as const;

const RESERVED_SLUGS = new Set<string>([
  ...BUILTIN_PLUGIN_NAMES,
  "help",
  "gcp",
  "gocontrolpanel",
  "plugin",
  "plugins",
  "core",
  "system",
  "server",
]);

export const PLUGIN_SLUG = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;
export const PLUGIN_COMMAND = /^[a-z0-9][a-z0-9_-]{0,31}$/;

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

const httpsUrl = z
  .string()
  .max(300)
  .url()
  .refine((value) => value.startsWith("https://"), "Must be an https:// URL");

const unique = <T>(values: T[]) => new Set(values).size === values.length;

export const pluginManifestSchema = z
  .object({
    slug: z
      .string()
      .regex(PLUGIN_SLUG, "3-40 characters: lowercase letters, digits and dashes")
      .refine((slug) => !slug.includes("--"), "No double dashes")
      .refine((slug) => !isReservedSlug(slug), "This name is reserved"),
    name: z.string().trim().min(1).max(60),
    version: z.string().refine(isValidVersion, "Must be a semantic version like 1.2.3"),
    sdk: z.number().int().min(1),
    description: z.string().trim().min(1).max(300),
    author: z.string().trim().min(1).max(100),
    license: z.string().trim().max(100).optional(),
    repository: httpsUrl.optional(),
    homepage: httpsUrl.optional(),
    entry: z
      .string()
      .regex(/^[A-Za-z0-9_\-/.]+\.js$/, "Must be a .js file in the package")
      .refine((path) => !path.split("/").includes(".."), "Must stay inside the package")
      .default("index.js"),
    gamemodes: z
      .array(z.enum(GAME_MODE_TYPES))
      .max(GAME_MODE_TYPES.length)
      .refine(unique, "Duplicate game mode")
      .default([]),
    commands: z
      .array(
        z
          .string()
          .regex(PLUGIN_COMMAND, "Lowercase letters, digits, - and _")
          .refine((command) => command !== "help", "/help belongs to the panel"),
      )
      .max(20)
      .refine(unique, "Duplicate command")
      .default([]),
    capabilities: z
      .array(z.string().refine(isCapability, "Unknown capability"))
      .max(30)
      .refine(unique, "Duplicate capability")
      .refine(
        (capabilities) => capabilities.filter(isHttpCapability).length <= 10,
        "At most 10 web hosts",
      )
      .default([]),
    configSchema: pluginConfigSchemaSchema.optional(),
    helpText: z.string().max(1000).optional(),
  })
  .strict();

export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type PluginManifestInput = z.input<typeof pluginManifestSchema>;

export function parseManifest(raw: unknown):
  | { success: true; manifest: PluginManifest }
  | { success: false; issues: string[] } {
  const result = pluginManifestSchema.safeParse(raw);
  if (result.success) return { success: true, manifest: result.data };
  return {
    success: false,
    issues: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`,
    ),
  };
}
