import {
  reloadServerPluginsAs,
  saveServerPluginConfigAs,
  setServerPluginEnabledAs,
} from "@/actions/server-only/plugins";
import { getClient } from "@/lib/dbclient";
import { storedManifest } from "@/services/plugins";
import { validatePluginConfig, type PluginConfig } from "@gcp/shared";
import "server-only";
import { z } from "zod/v4";
import { coerceSetting } from "../modes";
import { chatSafe, fuzzyFind } from "../text";
import { CodriverError, defineTool, type ToolContext } from "../types";

interface InstalledPlugin {
  pluginId: string;
  slug: string;
  name: string;
  enabled: boolean;
  config: PluginConfig;
  manifest: unknown;
}

async function installedPlugins(serverId: string): Promise<InstalledPlugin[]> {
  const rows = await getClient().serverPlugins.findMany({
    where: { serverId, plugin: { source: { not: "builtin" } } },
    include: { plugin: true, version: true },
  });
  return rows.map((row) => ({
    pluginId: row.pluginId,
    slug: row.plugin.name,
    name: row.plugin.displayName ?? row.plugin.name,
    enabled: row.enabled,
    config: (row.config && typeof row.config === "object"
      ? row.config
      : {}) as PluginConfig,
    manifest: row.version?.manifest,
  }));
}

export async function findPlugin(
  ctx: ToolContext,
  query: string,
): Promise<InstalledPlugin> {
  const plugins = await installedPlugins(ctx.serverId);
  if (query.startsWith("id:")) {
    const plugin = plugins.find((plugin) => plugin.pluginId === query.slice(3));
    if (plugin) return plugin;
    throw new CodriverError(
      "The confirmed plugin is no longer installed. Ask again.",
    );
  }
  // "the live round plugin" -> "live round"
  const cleaned = query.replace(/\b(the|plugin)\b/gi, " ").trim() || query;
  const found = fuzzyFind(
    cleaned,
    plugins,
    (p) => `${p.name} ${p.slug.replace(/-/g, " ")}`,
  );
  if (found.kind === "match") return found.item;
  if (found.kind === "ambiguous") {
    throw new CodriverError(
      `Which plugin: ${found.items.map((p) => chatSafe(p.name, 40)).join(", ")}?`,
    );
  }
  throw new CodriverError(
    `No installed plugin matches "${chatSafe(query, 40)}".`,
  );
}

export const setPluginEnabled = defineTool({
  name: "set_plugin_enabled",
  description: "Turn an installed plugin on or off on this server.",
  category: "plugins",
  minRole: "admin",
  input: z.strictObject({
    plugin: z.string().min(1).max(60),
    enabled: z.boolean(),
  }),
  async run(ctx, input) {
    const plugin = await findPlugin(ctx, input.plugin);
    if (plugin.enabled === input.enabled) {
      return {
        changed: false,
        reply: `${chatSafe(plugin.name, 60)} is already ${input.enabled ? "on" : "off"}.`,
      };
    }
    await setServerPluginEnabledAs(
      ctx.actor,
      ctx.serverId,
      plugin.pluginId,
      input.enabled,
    );
    return {
      reply: `${chatSafe(plugin.name, 60)} is now ${input.enabled ? "on" : "off"}.`,
    };
  },
});

type ScalarField = {
  type: string;
  title?: string;
  description?: string;
  secret?: boolean;
};

// Top-level text, number and on/off settings only. Secrets never go through chat: requests are
// stored in the history.
function settableFields(plugin: InstalledPlugin): Map<string, ScalarField> {
  const schema = storedManifest(plugin.manifest)?.configSchema;
  const fields = new Map<string, ScalarField>();
  for (const [key, field] of Object.entries(schema?.properties ?? {})) {
    const f = field as ScalarField;
    if (
      ["string", "number", "integer", "boolean"].includes(f.type) &&
      !f.secret
    ) {
      fields.set(key, f);
    }
  }
  return fields;
}

function resolveChanges(
  plugin: InstalledPlugin,
  settings: { name: string; value: string | number | boolean }[],
): PluginConfig {
  const fields = [...settableFields(plugin).entries()];
  if (fields.length === 0) {
    throw new CodriverError(
      `${chatSafe(plugin.name, 60)} has no settings Codriver can change.`,
    );
  }
  const changes: PluginConfig = {};
  for (const { name, value } of settings) {
    const found = fuzzyFind(
      name,
      fields,
      ([key, field]) => `${field.title ?? ""} ${key}`,
    );
    if (found.kind !== "match") {
      throw new CodriverError(
        `${chatSafe(plugin.name, 60)} has no setting "${chatSafe(name, 30)}" Codriver can change.`,
      );
    }
    const [key, field] = found.item;
    const type =
      field.type === "integer"
        ? "int"
        : field.type === "number"
          ? "float"
          : field.type;
    changes[key] = coerceSetting(
      {
        name: key,
        description: "",
        default: "",
        type: type as "int" | "float" | "boolean" | "string",
      },
      value,
    );
  }
  const schema = storedManifest(plugin.manifest)?.configSchema;
  if (
    !schema ||
    !validatePluginConfig(schema, { ...plugin.config, ...changes }).success
  ) {
    throw new CodriverError(
      `Those settings are invalid for ${chatSafe(plugin.name, 60)}. Check the plugin settings in the panel.`,
    );
  }
  return changes;
}

const settingsInput = z
  .array(
    z.strictObject({
      name: z.string().min(1).max(60),
      value: z.union([z.string().max(200), z.number(), z.boolean()]),
    }),
  )
  .min(1)
  .max(10);

export const setPluginConfig = defineTool({
  name: "set_plugin_config",
  description: "Change settings of an installed plugin.",
  category: "plugins",
  minRole: "admin",
  input: z.strictObject({
    plugin: z.string().min(1).max(60),
    settings: settingsInput,
  }),
  async prepare(ctx, input) {
    const plugin = await findPlugin(ctx, input.plugin);
    resolveChanges(plugin, input.settings);
    return { ...input, plugin: `id:${plugin.pluginId}` };
  },
  async confirm(ctx, input) {
    const plugin = await findPlugin(ctx, input.plugin);
    const changes = resolveChanges(plugin, input.settings);
    return `Set ${Object.entries(changes)
      .map(([key, value]) => `${key} to ${chatSafe(String(value), 30)}`)
      .join(", ")} for ${chatSafe(plugin.name, 60)}?`;
  },
  async run(ctx, input) {
    const plugin = await findPlugin(ctx, input.plugin);
    const changes = resolveChanges(plugin, input.settings);
    // The save validates the whole config against the plugin's schema
    await saveServerPluginConfigAs(ctx.actor, ctx.serverId, plugin.pluginId, {
      ...plugin.config,
      ...changes,
    });
    return { reply: `Updated the settings of ${chatSafe(plugin.name, 60)}.` };
  },
});

export const reloadPlugins = defineTool({
  name: "reload_plugins",
  description: "Reload all plugins on this server.",
  category: "plugins",
  minRole: "admin",
  input: z.strictObject({}),
  async run(ctx) {
    await reloadServerPluginsAs(ctx.actor, ctx.serverId);
    return { reply: "Reloading the plugins." };
  },
});

export const listPlugins = defineTool({
  name: "list_plugins",
  description: "List installed plugins and whether they are enabled.",
  category: "info",
  minRole: "moderator",
  input: z.strictObject({}),
  async run(ctx) {
    const plugins = await installedPlugins(ctx.serverId);
    return {
      reply: plugins.length
        ? chatSafe(
            plugins
              .map((p) => `${p.name}: ${p.enabled ? "on" : "off"}`)
              .join(", "),
            250,
          )
        : "No plugins installed.",
    };
  },
});

export const pluginTools = [
  setPluginEnabled,
  setPluginConfig,
  reloadPlugins,
  listPlugins,
];
