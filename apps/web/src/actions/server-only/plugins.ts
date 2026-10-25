import { logAudit } from "@/actions/database/server-only/audit-logs";
import { requirePermission, type Actor } from "@/lib/actor";
import { getClient } from "@/lib/dbclient";
import { gbxService, publishServerEvent } from "@/lib/gbx-service";
import {
  downloadMarketplacePackage,
  findMarketplacePlugin,
  getMarketplaceIndex,
} from "@/lib/marketplace";
import { storedManifest } from "@/services/plugins";
import { ServerError } from "@/types/responses";
import type { Prisma } from "@tmcontrolpanel/db";
import {
  findVersion,
  isFirstPartySlug,
  isVersionCompatible,
  mergeSecrets,
  serverPermissions,
  validatePluginConfig,
  type PluginConfig,
} from "@tmcontrolpanel/shared";
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

export async function installedRow(serverId: string, pluginId: string) {
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

// The admin saw and accepted every capability the version asks for
export function assertConsent(
  required: readonly string[],
  accepted: readonly string[],
): void {
  const missing = required.filter(
    (capability) => !accepted.includes(capability),
  );
  if (missing.length > 0) {
    throw new ServerError(
      `Accept the plugin's capabilities first (${missing.join(", ")})`,
      "CapabilitiesNotAccepted",
    );
  }
}

export interface ResolvedVersion {
  pluginId: string;
  versionId: string;
  capabilities: string[];
}

// Makes a marketplace version available on this panel, downloading it when needed
export async function ensureMarketplaceVersion(
  slug: string,
  version: string,
): Promise<ResolvedVersion> {
  const db = getClient();
  const index = await getMarketplaceIndex().catch(() => null);
  const listed = index ? findMarketplacePlugin(index, slug) : null;
  const entry = listed ? findVersion(listed, version) : null;
  if (entry?.yanked) {
    throw new ServerError(
      `${slug} ${version} was withdrawn from the marketplace${entry.yankReason ? `: ${entry.yankReason}` : ""}`,
      "PluginYanked",
    );
  }

  const row = await db.plugins.findUnique({ where: { name: slug } });
  if (row && row.source !== "marketplace") {
    throw new ServerError(
      `Another plugin on this panel is already called "${slug}"`,
      "PluginNameTaken",
    );
  }

  if (row) {
    const stored = await db.pluginVersions.findUnique({
      where: { pluginId_version: { pluginId: row.id, version } },
      select: { id: true, sha256: true, manifest: true, yanked: true },
    });
    if (stored) {
      if (stored.yanked)
        throw new ServerError(
          `${slug} ${version} was withdrawn`,
          "PluginYanked",
        );
      if (entry && entry.sha256 !== stored.sha256) {
        throw new ServerError(
          "The stored copy of this version differs from the marketplace",
          "PluginChecksumMismatch",
        );
      }
      return {
        pluginId: row.id,
        versionId: stored.id,
        capabilities: storedManifest(stored.manifest)?.capabilities ?? [],
      };
    }
  }

  if (!listed || !entry) {
    throw new ServerError(
      `${slug} ${version} is not in the marketplace`,
      "PluginNotFound",
    );
  }
  if (!isVersionCompatible(entry)) {
    throw new ServerError(
      `${slug} ${version} needs a newer version of TMControlPanel`,
      "PluginIncompatible",
    );
  }

  const { bytes, pkg } = await downloadMarketplacePackage(listed, entry);
  const { manifest } = pkg;
  const details = {
    displayName: manifest.name,
    description: manifest.description,
    author: manifest.author,
  };
  const plugin = await db.plugins.upsert({
    where: { name: slug },
    create: { name: slug, source: "marketplace", ...details },
    update: details,
  });
  const stored = await db.pluginVersions.upsert({
    where: { pluginId_version: { pluginId: plugin.id, version } },
    create: {
      pluginId: plugin.id,
      version,
      sdk: manifest.sdk,
      sha256: pkg.sha256,
      size: pkg.size,
      manifest: manifest as unknown as Prisma.InputJsonValue,
      package: Buffer.from(bytes),
    },
    update: {},
    select: { id: true },
  });
  return {
    pluginId: plugin.id,
    versionId: stored.id,
    capabilities: manifest.capabilities,
  };
}

export async function installVersion(
  actor: Actor,
  serverId: string,
  resolved: ResolvedVersion,
  action: string,
  details: Prisma.InputJsonValue,
): Promise<void> {
  const db = getClient();
  const installed = {
    versionId: resolved.versionId,
    grantedCapabilities: resolved.capabilities,
    installedById: actor.userId,
    installedAt: new Date(),
  };
  // A new version keeps the enabled flag and the config of the previous one
  await db.serverPlugins.upsert({
    where: { serverId_pluginId: { serverId, pluginId: resolved.pluginId } },
    create: {
      serverId,
      pluginId: resolved.pluginId,
      enabled: true,
      ...installed,
    },
    update: installed,
  });
  await publishServerEvent({ type: "server.plugins.updated", serverId });
  await logAudit(actor.userId, serverId, action, details);
}

const versionString = z.string().min(1).max(64);
const capabilityList = z.array(z.string().max(300)).max(50);

export async function installMarketplacePluginAs(
  actor: Actor,
  serverId: string,
  slug: string,
  version: string,
  acceptedCapabilities: string[],
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const args = parse(
    z.object({ slug: id, version: versionString, accepted: capabilityList }),
    { slug, version, accepted: acceptedCapabilities },
  );
  const resolved = await ensureMarketplaceVersion(args.slug, args.version);
  assertConsent(resolved.capabilities, args.accepted);
  await installVersion(actor, serverId, resolved, "server.plugins.install", {
    slug: args.slug,
    version: args.version,
    source: "marketplace",
    capabilities: resolved.capabilities,
  });
}

// Update or roll back a marketplace plugin; new capabilities need consent again
export async function changeMarketplacePluginVersionAs(
  actor: Actor,
  serverId: string,
  pluginId: string,
  version: string,
  acceptedCapabilities: string[],
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const args = parse(
    z.object({
      pluginId: id,
      version: versionString,
      accepted: capabilityList,
    }),
    { pluginId, version, accepted: acceptedCapabilities },
  );
  const row = await installedRow(serverId, args.pluginId);
  if (row.plugin.source !== "marketplace") {
    throw new ServerError(
      "Only marketplace plugins can change version here",
      "PluginNotFromMarketplace",
    );
  }
  const resolved = await ensureMarketplaceVersion(
    row.plugin.name,
    args.version,
  );
  assertConsent(resolved.capabilities, args.accepted);
  await installVersion(actor, serverId, resolved, "server.plugins.update", {
    slug: row.plugin.name,
    from: row.version?.version ?? null,
    to: args.version,
    capabilities: resolved.capabilities,
  });
}

// Removes the plugin, its config and its stored data from the server
export async function uninstallServerPluginAs(
  actor: Actor,
  serverId: string,
  pluginId: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.admin, serverId);

  const args = parse(z.object({ pluginId: id }), { pluginId });
  const row = await installedRow(serverId, args.pluginId);
  const db = getClient();

  await db.$transaction([
    db.pluginStorage.deleteMany({
      where: { serverId, pluginId: args.pluginId },
    }),
    db.serverPlugins.delete({
      where: { serverId_pluginId: { serverId, pluginId: args.pluginId } },
    }),
  ]);
  // Marketplace downloads nobody runs any more are dropped; uploads stay in their owner's list
  // and first-party plugins ship with the service, so they stay installable
  if (
    row.plugin.source === "marketplace" &&
    !isFirstPartySlug(row.plugin.name)
  ) {
    const remaining = await db.serverPlugins.count({
      where: { pluginId: args.pluginId },
    });
    if (remaining === 0)
      await db.plugins.delete({ where: { id: args.pluginId } });
  }

  await publishServerEvent({ type: "server.plugins.updated", serverId });
  await logAudit(actor.userId, serverId, "server.plugins.uninstall", {
    slug: row.plugin.name,
    version: row.version?.version ?? null,
  });
}
