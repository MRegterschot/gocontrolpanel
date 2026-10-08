import { logAudit } from "@/actions/database/server-only/audit-logs";
import { requirePermission, type Actor } from "@/lib/actor";
import { getClient } from "@/lib/dbclient";
import { gbxService, publishServerEvent } from "@/lib/gbx-service";
import { storedManifest } from "@/services/plugins";
import { ServerError } from "@/types/responses";
import type { Prisma } from "@gcp/db";
import {
  mergeSecrets,
  serverPermissions,
  validatePluginConfig,
  type PluginConfig,
} from "@gcp/shared";
import "server-only";
import { z } from "zod";

// Plugin operations for an actor; the Server Actions and Codriver both call these

const id = z.string().min(1).max(100);

function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ServerError("Invalid request", "ValidationError");
  return result.data;
}

async function installedRow(serverId: string, pluginId: string) {
  const row = await getClient().serverPlugins.findUnique({
    where: { serverId_pluginId: { serverId, pluginId } },
    include: {
      plugin: { select: { name: true, source: true } },
      version: { select: { version: true, manifest: true, yanked: true } },
    },
  });
  if (!row || row.plugin.source === "builtin") {
    throw new ServerError(
      "The plugin is not installed on this server",
      "PluginNotFound",
    );
  }
  return row;
}

export async function setServerPluginEnabledAs(
  actor: Actor,
  serverId: string,
  pluginId: string,
  enabled: boolean,
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const args = parse(z.object({ pluginId: id, enabled: z.boolean() }), {
    pluginId,
    enabled,
  });
  const row = await installedRow(serverId, args.pluginId);
  if (args.enabled && row.version?.yanked) {
    throw new ServerError(
      "This version was withdrawn from the marketplace; install another version first",
      "PluginYanked",
    );
  }

  await getClient().serverPlugins.update({
    where: { serverId_pluginId: { serverId, pluginId: args.pluginId } },
    data: { enabled: args.enabled },
  });
  await publishServerEvent({ type: "server.plugins.updated", serverId });
  await logAudit(
    actor.userId,
    serverId,
    args.enabled ? "server.plugins.enable" : "server.plugins.disable",
    { slug: row.plugin.name },
  );
}

export async function saveServerPluginConfigAs(
  actor: Actor,
  serverId: string,
  pluginId: string,
  config: PluginConfig,
  clearedSecrets: string[] = [],
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const args = parse(
    z.object({
      pluginId: id,
      config: z.record(z.unknown()),
      cleared: z.array(z.string()).max(50),
    }),
    { pluginId, config, cleared: clearedSecrets },
  );
  const row = await installedRow(serverId, args.pluginId);
  const schema = storedManifest(row.version?.manifest)?.configSchema;
  if (!schema)
    throw new ServerError("This plugin has no settings", "PluginHasNoConfig");

  const result = validatePluginConfig(schema, args.config);
  if (!result.success) {
    throw new ServerError(
      result.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; "),
      "ValidationError",
    );
  }
  const previous = (
    row.config && typeof row.config === "object" ? row.config : {}
  ) as PluginConfig;
  const next = mergeSecrets(schema, previous, result.data, args.cleared);

  await getClient().serverPlugins.update({
    where: { serverId_pluginId: { serverId, pluginId: args.pluginId } },
    data: { config: next as Prisma.InputJsonValue },
  });
  await publishServerEvent({ type: "server.plugins.updated", serverId });
  await logAudit(actor.userId, serverId, "server.plugins.config.edit", {
    slug: row.plugin.name,
    // Which settings changed, not their values: some of them are secrets
    keys: Object.keys(result.data),
  });
}

export async function reloadServerPluginsAs(
  actor: Actor,
  serverId: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

  await gbxService.reloadPlugins(serverId);
}
