"use server";
import { assertResourceId } from "@/lib/resource-id";

import { logAudit } from "@/actions/database/server-only/audit-logs";
import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { getClient } from "@/lib/dbclient";
import { uploadOwnerFilter } from "@/lib/plugin-access";
import { routePermissions } from "@/routes";
import { getInstalledPlugins, storedManifest } from "@/services/plugins";
import type { UploadResult } from "@/types/plugins/catalog";
import { ServerError, ServerResponse } from "@/types/responses";
import type { Prisma } from "@gcp/db";
import {
  isFirstPartySlug,
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
  assertConsent,
  changeMarketplacePluginVersionAs,
  ensureMarketplaceVersion,
  installedRow,
  installMarketplacePluginAs,
  installVersion,
  type ResolvedVersion,
  saveServerPluginConfigAs,
  setServerPluginEnabledAs,
  uninstallServerPluginAs,
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

export async function installMarketplacePlugin(
  serverId: string,
  slug: string,
  version: string,
  acceptedCapabilities: string[],
): Promise<ServerResponse> {
  assertResourceId(serverId);
  return doServerActionWithAuth(serverAdmin(serverId), (session) =>
    installMarketplacePluginAs(
      actorFromSession(session),
      serverId,
      slug,
      version,
      acceptedCapabilities,
    ),
  );
}

export async function installUploadedPlugin(
  serverId: string,
  pluginId: string,
  versionId: string,
  acceptedCapabilities: string[],
): Promise<ServerResponse> {
  assertResourceId(serverId);
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
      actorFromSession(session),
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
  assertResourceId(serverId);
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
    const actor = actorFromSession(session);
    const row = await installedRow(serverId, args.pluginId);
    if (row.plugin.source === "marketplace") {
      return changeMarketplacePluginVersionAs(
        actor,
        serverId,
        args.pluginId,
        args.version,
        args.accepted,
      );
    }

    const resolved = await uploadedVersion(session, args.pluginId, {
      version: args.version,
    });
    assertConsent(resolved.capabilities, args.accepted);
    await installVersion(actor, serverId, resolved, "server.plugins.update", {
      slug: row.plugin.name,
      from: row.version?.version ?? null,
      to: args.version,
      capabilities: resolved.capabilities,
    });
  });
}

export interface UpdateAllResult {
  updated: string[];
  // Need the admin to accept new capabilities, so they are left alone
  needsConsent: string[];
  failed: string[];
}

// Updates every plugin with a newer version that asks for no new capabilities
export async function updateAllServerPlugins(
  serverId: string,
): Promise<ServerResponse<UpdateAllResult>> {
  assertResourceId(serverId);
  return doServerActionWithAuth(serverAdmin(serverId), async (session) => {
    const { data: plugins, error } = await getInstalledPlugins(serverId);
    if (error) throw new ServerError(error, "GetInstalledPluginsError");

    const result: UpdateAllResult = {
      updated: [],
      needsConsent: [],
      failed: [],
    };
    for (const plugin of plugins) {
      const update = plugin.update;
      if (!update || update.yanked) continue;
      if (
        update.capabilities.some((c) => !plugin.grantedCapabilities.includes(c))
      ) {
        result.needsConsent.push(plugin.name);
        continue;
      }
      try {
        const resolved =
          plugin.source === "marketplace"
            ? await ensureMarketplaceVersion(plugin.slug, update.version)
            : await uploadedVersion(session, plugin.pluginId, {
                version: update.version,
              });
        await installVersion(
          actorFromSession(session),
          serverId,
          resolved,
          "server.plugins.update",
          {
            slug: plugin.slug,
            from: plugin.version,
            to: update.version,
            capabilities: resolved.capabilities,
          },
        );
        result.updated.push(plugin.name);
      } catch {
        result.failed.push(plugin.name);
      }
    }
    return result;
  });
}

export async function setServerPluginEnabled(
  serverId: string,
  pluginId: string,
  enabled: boolean,
): Promise<ServerResponse> {
  assertResourceId(serverId);
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
  assertResourceId(serverId);
  return doServerActionWithAuth(serverAdmin(serverId), (session) =>
    uninstallServerPluginAs(actorFromSession(session), serverId, pluginId),
  );
}

export async function saveServerPluginConfig(
  serverId: string,
  pluginId: string,
  config: PluginConfig,
  clearedSecrets: string[] = [],
): Promise<ServerResponse> {
  assertResourceId(serverId);
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
          `"${manifest.slug}" is a plugin that ships with TMControlPanel; change the slug`,
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
