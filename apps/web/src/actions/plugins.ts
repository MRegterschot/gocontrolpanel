"use server";

import { logAudit } from "@/actions/database/server-only/audit-logs";
import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { getClient } from "@/lib/dbclient";
import { publishServerEvent } from "@/lib/gbx-service";
import {
  downloadMarketplacePackage,
  findMarketplacePlugin,
  getMarketplaceIndex,
} from "@/lib/marketplace";
import { uploadOwnerFilter } from "@/lib/plugin-access";
import { routePermissions } from "@/routes";
import { storedManifest } from "@/services/plugins";
import type { UploadResult } from "@/types/plugins/catalog";
import { ServerError, ServerResponse } from "@/types/responses";
import type { Prisma } from "@gcp/db";
import {
  findVersion,
  isFirstPartySlug,
  isVersionCompatible,
  PLUGIN_SDK_VERSION,
  type PluginConfig,
} from "@gcp/shared";
import {
  PACKAGE_LIMITS,
  PluginPackageError,
  readPluginPackage,
} from "@gcp/shared/plugin-package";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  saveServerPluginConfigAs,
  setServerPluginEnabledAs,
} from "./server-only/plugins";

const serverAdmin = (serverId: string) => [
  `servers:${serverId}:admin`,
  `group:servers:${serverId}:admin`,
];

const id = z.string().min(1).max(100);
const versionString = z.string().min(1).max(64);
const capabilityList = z.array(z.string().max(300)).max(50);

function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ServerError("Invalid request", "ValidationError");
  return result.data;
}

// The admin saw and accepted every capability the version asks for
function assertConsent(
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

interface ResolvedVersion {
  pluginId: string;
  versionId: string;
  capabilities: string[];
}

// Makes a marketplace version available on this panel, downloading it when needed
async function ensureMarketplaceVersion(
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
      `${slug} ${version} needs a newer version of GoControlPanel`,
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

// An uploaded version, if the user may install it
async function uploadedVersion(
  session: Session,
  pluginId: string,
  where: { id: string } | { version: string },
): Promise<ResolvedVersion> {
  const db = getClient();
  const plugin = await db.plugins.findFirst({
    where: { id: pluginId, source: "upload", ...uploadOwnerFilter(session) },
    select: { id: true },
  });
  if (!plugin) throw new ServerError("Plugin not found", "PluginNotFound");

  const version = await db.pluginVersions.findFirst({
    where: { pluginId, ...where },
    select: { id: true, manifest: true },
  });
  if (!version) throw new ServerError("Version not found", "PluginNotFound");
  return {
    pluginId,
    versionId: version.id,
    capabilities: storedManifest(version.manifest)?.capabilities ?? [],
  };
}

async function installVersion(
  session: Session,
  serverId: string,
  resolved: ResolvedVersion,
  action: string,
  details: Prisma.InputJsonValue,
): Promise<void> {
  const db = getClient();
  const installed = {
    versionId: resolved.versionId,
    grantedCapabilities: resolved.capabilities,
    installedById: session.user.id,
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
  await logAudit(session.user.id, serverId, action, details);
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

export async function installMarketplacePlugin(
  serverId: string,
  slug: string,
  version: string,
  acceptedCapabilities: string[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(serverAdmin(serverId), async (session) => {
    const args = parse(
      z.object({ slug: id, version: versionString, accepted: capabilityList }),
      { slug, version, accepted: acceptedCapabilities },
    );
    const resolved = await ensureMarketplaceVersion(args.slug, args.version);
    assertConsent(resolved.capabilities, args.accepted);
    await installVersion(
      session,
      serverId,
      resolved,
      "server.plugins.install",
      {
        slug: args.slug,
        version: args.version,
        source: "marketplace",
        capabilities: resolved.capabilities,
      },
    );
  });
}

export async function installUploadedPlugin(
  serverId: string,
  pluginId: string,
  versionId: string,
  acceptedCapabilities: string[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(serverAdmin(serverId), async (session) => {
    const args = parse(
      z.object({ pluginId: id, versionId: id, accepted: capabilityList }),
      {
        pluginId,
        versionId,
        accepted: acceptedCapabilities,
      },
    );
    const resolved = await uploadedVersion(session, args.pluginId, {
      id: args.versionId,
    });
    assertConsent(resolved.capabilities, args.accepted);
    await installVersion(
      session,
      serverId,
      resolved,
      "server.plugins.install",
      {
        pluginId: args.pluginId,
        versionId: args.versionId,
        source: "upload",
        capabilities: resolved.capabilities,
      },
    );
  });
}

// Update or roll back; new capabilities need consent again
export async function changeServerPluginVersion(
  serverId: string,
  pluginId: string,
  version: string,
  acceptedCapabilities: string[],
): Promise<ServerResponse> {
  return doServerActionWithAuth(serverAdmin(serverId), async (session) => {
    const args = parse(
      z.object({
        pluginId: id,
        version: versionString,
        accepted: capabilityList,
      }),
      {
        pluginId,
        version,
        accepted: acceptedCapabilities,
      },
    );
    const row = await installedRow(serverId, args.pluginId);
    const resolved =
      row.plugin.source === "marketplace"
        ? await ensureMarketplaceVersion(row.plugin.name, args.version)
        : await uploadedVersion(session, args.pluginId, {
            version: args.version,
          });

    assertConsent(resolved.capabilities, args.accepted);
    await installVersion(session, serverId, resolved, "server.plugins.update", {
      slug: row.plugin.name,
      from: row.version?.version ?? null,
      to: args.version,
      capabilities: resolved.capabilities,
    });
  });
}

export async function setServerPluginEnabled(
  serverId: string,
  pluginId: string,
  enabled: boolean,
): Promise<ServerResponse> {
  return doServerActionWithAuth(serverAdmin(serverId), (session) =>
    setServerPluginEnabledAs(
      actorFromSession(session),
      serverId,
      pluginId,
      enabled,
    ),
  );
}

// Removes the plugin, its config and its stored data from the server
export async function uninstallServerPlugin(
  serverId: string,
  pluginId: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(serverAdmin(serverId), async (session) => {
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
    await logAudit(session.user.id, serverId, "server.plugins.uninstall", {
      slug: row.plugin.name,
      version: row.version?.version ?? null,
    });
  });
}

export async function saveServerPluginConfig(
  serverId: string,
  pluginId: string,
  config: PluginConfig,
  clearedSecrets: string[] = [],
): Promise<ServerResponse> {
  return doServerActionWithAuth(serverAdmin(serverId), (session) =>
    saveServerPluginConfigAs(
      actorFromSession(session),
      serverId,
      pluginId,
      config,
      clearedSecrets,
    ),
  );
}

// A private plugin (PM-14): installable on the uploader's own servers, unreviewed but sandboxed
export async function uploadPluginPackage(
  formData: FormData,
): Promise<ServerResponse<UploadResult>> {
  return doServerActionWithAuth(
    routePermissions.plugins.upload,
    async (session) => {
      const file = formData.get("file");
      if (!(file instanceof File))
        throw new ServerError("Choose a plugin package", "ValidationError");
      if (file.size > PACKAGE_LIMITS.maxPackageBytes) {
        throw new ServerError(
          "A plugin package may be at most 5 MB",
          "ValidationError",
        );
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      let pkg;
      try {
        pkg = readPluginPackage(bytes);
      } catch (error) {
        if (error instanceof PluginPackageError) {
          throw new ServerError(
            error.issues.join("; "),
            "InvalidPluginPackage",
          );
        }
        throw error;
      }
      const { manifest } = pkg;
      if (isFirstPartySlug(manifest.slug)) {
        throw new ServerError(
          `"${manifest.slug}" is a plugin that ships with GoControlPanel; change the slug`,
          "PluginNameTaken",
        );
      }
      if (manifest.sdk > PLUGIN_SDK_VERSION) {
        throw new ServerError(
          `The plugin needs plugin SDK ${manifest.sdk}; this panel runs ${PLUGIN_SDK_VERSION}`,
          "PluginIncompatible",
        );
      }

      const db = getClient();
      const existing = await db.plugins.findUnique({
        where: { name: manifest.slug },
      });
      if (
        existing &&
        (existing.source !== "upload" ||
          (existing.ownerId !== session.user.id && !session.user.admin))
      ) {
        throw new ServerError(
          `Another plugin on this panel is already called "${manifest.slug}"; change the slug`,
          "PluginNameTaken",
        );
      }

      if (existing) {
        const same = await db.pluginVersions.findUnique({
          where: {
            pluginId_version: {
              pluginId: existing.id,
              version: manifest.version,
            },
          },
          select: { sha256: true },
        });
        if (same && same.sha256 !== pkg.sha256) {
          throw new ServerError(
            `Version ${manifest.version} is already uploaded; raise the version in tmcp-plugin.json`,
            "PluginVersionExists",
          );
        }
      }

      const details = {
        displayName: manifest.name,
        description: manifest.description,
        author: manifest.author,
      };
      const plugin = await db.plugins.upsert({
        where: { name: manifest.slug },
        create: {
          name: manifest.slug,
          source: "upload",
          ownerId: session.user.id,
          ...details,
        },
        update: details,
      });
      await db.pluginVersions.upsert({
        where: {
          pluginId_version: { pluginId: plugin.id, version: manifest.version },
        },
        create: {
          pluginId: plugin.id,
          version: manifest.version,
          sdk: manifest.sdk,
          sha256: pkg.sha256,
          size: pkg.size,
          manifest: manifest as unknown as Prisma.InputJsonValue,
          package: Buffer.from(bytes),
          uploadedById: session.user.id,
        },
        update: {},
      });

      await logAudit(session.user.id, plugin.id, "plugins.upload", {
        slug: manifest.slug,
        version: manifest.version,
        sha256: pkg.sha256,
        capabilities: manifest.capabilities,
      });
      return {
        pluginId: plugin.id,
        slug: manifest.slug,
        name: manifest.name,
        version: manifest.version,
        capabilities: manifest.capabilities,
      };
    },
  );
}

export async function deleteUploadedPluginVersion(
  versionId: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    routePermissions.plugins.view,
    async (session) => {
      const args = parse(z.object({ versionId: id }), { versionId });
      const db = getClient();
      const version = await db.pluginVersions.findFirst({
        where: {
          id: args.versionId,
          plugin: { source: "upload", ...uploadOwnerFilter(session) },
        },
        select: {
          id: true,
          version: true,
          pluginId: true,
          plugin: { select: { name: true } },
          _count: { select: { serverPlugins: true } },
        },
      });
      if (!version)
        throw new ServerError("Version not found", "PluginNotFound");
      if (version._count.serverPlugins > 0) {
        throw new ServerError(
          `Version ${version.version} is installed on ${version._count.serverPlugins} server(s); uninstall it first`,
          "PluginInUse",
        );
      }

      await db.pluginVersions.delete({ where: { id: version.id } });
      if (
        (await db.pluginVersions.count({
          where: { pluginId: version.pluginId },
        })) === 0
      ) {
        await db.plugins.delete({ where: { id: version.pluginId } });
      }
      await logAudit(
        session.user.id,
        version.pluginId,
        "plugins.versions.delete",
        {
          slug: version.plugin.name,
          version: version.version,
        },
      );
    },
  );
}

export async function deleteUploadedPlugin(
  pluginId: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    routePermissions.plugins.view,
    async (session) => {
      const args = parse(z.object({ pluginId: id }), { pluginId });
      const db = getClient();
      const plugin = await db.plugins.findFirst({
        where: {
          id: args.pluginId,
          source: "upload",
          ...uploadOwnerFilter(session),
        },
        select: {
          id: true,
          name: true,
          _count: { select: { serverPlugins: true } },
        },
      });
      if (!plugin) throw new ServerError("Plugin not found", "PluginNotFound");
      if (plugin._count.serverPlugins > 0) {
        throw new ServerError(
          `The plugin is installed on ${plugin._count.serverPlugins} server(s); uninstall it first`,
          "PluginInUse",
        );
      }

      await db.plugins.delete({ where: { id: plugin.id } });
      await logAudit(session.user.id, plugin.id, "plugins.delete", {
        slug: plugin.name,
      });
    },
  );
}
