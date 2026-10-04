import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import {
  findMarketplacePlugin,
  getMarketplaceIndex,
  getMarketplaceReadme,
  marketplaceIndexUrl,
  marketplaceUrl,
} from "@/lib/marketplace";
import { getAdminServers, uploadOwnerFilter, type ServerSummary } from "@/lib/plugin-access";
import { getErrorMessage } from "@/lib/utils";
import { routePermissions } from "@/routes";
import type {
  AvailablePlugin,
  CatalogPlugin,
  CatalogPluginDetail,
  CatalogVersion,
  InstalledPlugin,
  Marketplace,
  PluginSourceKind,
  UploadedPlugin,
  VersionChoice,
} from "@/types/plugins/catalog";
import { ServerResponse } from "@/types/responses";
import {
  compareVersions,
  isFirstPartySlug,
  isVersionCompatible,
  latestVersion,
  maskSecrets,
  PLUGIN_SDK_VERSION,
  pluginManifestSchema,
  reportPluginUrl,
  type MarketplacePlugin,
  type MarketplaceVersion,
  type PluginConfig,
  type PluginManifest,
} from "@gcp/shared";
import "server-only";

const serverAdmin = (serverId: string) => [
  `servers:${serverId}:admin`,
  `group:servers:${serverId}:admin`,
];

// Manifests are validated before they are stored; this only guards against hand-edited rows
export function storedManifest(raw: unknown): PluginManifest | null {
  const result = pluginManifestSchema.safeParse(raw);
  return result.success ? result.data : null;
}

function toCatalogVersion(version: MarketplaceVersion): CatalogVersion {
  return {
    version: version.version,
    sdk: version.sdk,
    capabilities: version.capabilities,
    gamemodes: version.gamemodes,
    commands: version.commands,
    publishedAt: version.publishedAt,
    changelog: version.changelog ?? null,
    yanked: version.yanked,
    yankReason: version.yankReason ?? null,
    compatible: isVersionCompatible(version),
    size: version.size,
  };
}

function toCatalogPlugin(plugin: MarketplacePlugin, installedOn: number): CatalogPlugin {
  const latest = latestVersion(plugin);
  return {
    slug: plugin.slug,
    name: plugin.name,
    description: plugin.description,
    author: plugin.author,
    tags: plugin.tags,
    icon: marketplaceUrl(plugin.icon),
    latest: latest ? toCatalogVersion(latest) : null,
    installedOn,
  };
}

// slug -> number of the given servers running a marketplace plugin with that slug
async function installCounts(serverIds: string[]): Promise<Map<string, number>> {
  const rows = await getClient().serverPlugins.findMany({
    where: { serverId: { in: serverIds }, plugin: { source: "marketplace" } },
    select: { plugin: { select: { name: true } } },
  });
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.plugin.name, (counts.get(row.plugin.name) ?? 0) + 1);
  return counts;
}

export async function getMarketplace(): Promise<ServerResponse<Marketplace>> {
  return doServerActionWithAuth(routePermissions.plugins.view, async (session) => {
    if (!marketplaceIndexUrl()) {
      return { enabled: false, name: null, repository: null, plugins: [], error: null };
    }

    let index;
    try {
      index = await getMarketplaceIndex();
    } catch (error) {
      return { enabled: true, name: null, repository: null, plugins: [], error: getErrorMessage(error) };
    }
    if (!index) return { enabled: false, name: null, repository: null, plugins: [], error: null };

    const servers = await getAdminServers(session);
    const counts = await installCounts(servers.map((s) => s.id));
    return {
      enabled: true,
      name: index.name ?? null,
      repository: index.repository ?? null,
      plugins: index.plugins.map((plugin) => toCatalogPlugin(plugin, counts.get(plugin.slug) ?? 0)),
      error: null,
    };
  });
}

export async function getMarketplacePlugin(
  slug: string,
): Promise<ServerResponse<CatalogPluginDetail | null>> {
  return doServerActionWithAuth(routePermissions.plugins.view, async (session) => {
    const index = await getMarketplaceIndex();
    const plugin = index && findMarketplacePlugin(index, slug);
    if (!index || !plugin) return null;

    const db = getClient();
    const servers = await getAdminServers(session);
    const [row, installs] = await Promise.all([
      db.plugins.findUnique({ where: { name: slug }, select: { id: true, source: true } }),
      db.serverPlugins.findMany({
        where: { serverId: { in: servers.map((s) => s.id) }, plugin: { name: slug } },
        select: {
          serverId: true,
          enabled: true,
          plugin: { select: { source: true } },
          version: { select: { version: true } },
        },
      }),
    ]);

    const conflict =
      row && row.source !== "marketplace"
        ? row.source === "builtin"
          ? "A built-in plugin already uses this name."
          : "An uploaded plugin on this panel already uses this name."
        : null;

    return {
      ...toCatalogPlugin(plugin, installs.length),
      license: plugin.license ?? null,
      repository: plugin.repository ?? null,
      homepage: plugin.homepage ?? null,
      readme: await getMarketplaceReadme(plugin),
      screenshots: plugin.screenshots
        .map((ref) => marketplaceUrl(ref))
        .filter((url): url is string => url !== null),
      reportUrl: reportPluginUrl(index, slug),
      versions: plugin.versions.map(toCatalogVersion),
      pluginId: row?.source === "marketplace" ? row.id : null,
      servers: servers.map((server) => {
        const install = installs.find((i) => i.serverId === server.id);
        return {
          ...server,
          installed: install
            ? {
                version: install.version?.version ?? "?",
                enabled: install.enabled,
                source: install.plugin.source as PluginSourceKind,
              }
            : null,
        };
      }),
      conflict,
    };
  });
}

function storedChoice(version: {
  version: string;
  manifest: unknown;
  yanked: boolean;
}): VersionChoice {
  return {
    version: version.version,
    stored: true,
    capabilities: storedManifest(version.manifest)?.capabilities ?? [],
    yanked: version.yanked,
  };
}

// Marketplace and uploaded plugins on one server, with the versions it can move to
export async function getInstalledPlugins(
  serverId: string,
): Promise<ServerResponse<InstalledPlugin[]>> {
  return doServerActionWithAuth(serverAdmin(serverId), async () => {
    const db = getClient();
    const rows = await db.serverPlugins.findMany({
      where: { serverId, plugin: { source: { not: "builtin" } } },
      include: {
        plugin: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            author: true,
            source: true,
            versions: { select: { version: true, manifest: true, yanked: true } },
          },
        },
        version: { select: { version: true, manifest: true, yanked: true, yankReason: true } },
      },
      orderBy: { plugin: { name: "asc" } },
    });

    let index = null;
    if (rows.some((row) => row.plugin.source === "marketplace")) {
      index = await getMarketplaceIndex().catch(() => null);
    }

    return rows.map((row): InstalledPlugin => {
      const manifest = storedManifest(row.version?.manifest);
      const installed = row.version?.version ?? "?";
      const source = row.plugin.source as PluginSourceKind;

      const choices = new Map<string, VersionChoice>();
      for (const version of row.plugin.versions) choices.set(version.version, storedChoice(version));
      const listed = source === "marketplace" && index ? findMarketplacePlugin(index, row.plugin.name) : null;
      for (const version of listed?.versions ?? []) {
        if (!isVersionCompatible(version)) continue;
        const stored = choices.get(version.version);
        choices.set(version.version, {
          version: version.version,
          stored: !!stored,
          capabilities: version.capabilities,
          yanked: version.yanked || (stored?.yanked ?? false),
        });
      }
      const versions = [...choices.values()].sort((a, b) => compareVersions(b.version, a.version));

      const newest =
        source === "marketplace" && listed
          ? latestVersion(listed)?.version
          : versions.find((v) => !v.yanked)?.version;
      const update =
        newest && compareVersions(newest, installed) > 0 ? (choices.get(newest) ?? null) : null;

      const schema = manifest?.configSchema ?? null;
      const config = (row.config && typeof row.config === "object" && !Array.isArray(row.config)
        ? row.config
        : {}) as PluginConfig;
      const masked = schema ? maskSecrets(schema, config) : { config, setSecrets: [] };

      return {
        pluginId: row.pluginId,
        slug: row.plugin.name,
        firstParty: source === "marketplace" && isFirstPartySlug(row.plugin.name),
        name: manifest?.name ?? row.plugin.displayName ?? row.plugin.name,
        description: manifest?.description ?? row.plugin.description,
        author: manifest?.author ?? row.plugin.author,
        source,
        version: installed,
        enabled: row.enabled,
        yanked: row.version?.yanked ?? false,
        yankReason: row.version?.yankReason ?? null,
        grantedCapabilities: Array.isArray(row.grantedCapabilities)
          ? row.grantedCapabilities.filter((c): c is string => typeof c === "string")
          : [],
        capabilities: manifest?.capabilities ?? [],
        commands: manifest?.commands ?? [],
        gamemodes: manifest?.gamemodes ?? [],
        configSchema: schema,
        config: masked.config,
        setSecrets: masked.setSecrets,
        update,
        versions,
      };
    });
  });
}

// Private uploads the user can manage and install
export async function getUploadedPlugins(): Promise<ServerResponse<UploadedPlugin[]>> {
  return doServerActionWithAuth(routePermissions.plugins.view, async (session) => {
    const db = getClient();
    const rows = await db.plugins.findMany({
      where: { source: "upload", ...uploadOwnerFilter(session) },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        owner: { select: { nickName: true } },
        versions: {
          select: {
            id: true,
            version: true,
            sha256: true,
            size: true,
            manifest: true,
            createdAt: true,
            _count: { select: { serverPlugins: true } },
          },
        },
        serverPlugins: {
          select: {
            serverId: true,
            server: { select: { name: true } },
            version: { select: { version: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return rows.map((row) => ({
      pluginId: row.id,
      slug: row.name,
      name: row.displayName ?? row.name,
      description: row.description,
      owner: row.owner?.nickName ?? null,
      versions: row.versions
        .map((version) => ({
          id: version.id,
          version: version.version,
          sha256: version.sha256,
          size: version.size,
          capabilities: storedManifest(version.manifest)?.capabilities ?? [],
          createdAt: version.createdAt.toISOString(),
          installs: version._count.serverPlugins,
        }))
        .sort((a, b) => compareVersions(b.version, a.version)),
      installedOn: row.serverPlugins.map((sp) => ({
        serverId: sp.serverId,
        serverName: sp.server.name,
        version: sp.version?.version ?? "?",
      })),
    }));
  });
}

// Stored plugins the server doesn't run yet: the first-party ones, earlier marketplace
// downloads and the user's uploads
export async function getAvailablePlugins(
  serverId: string,
): Promise<ServerResponse<AvailablePlugin[]>> {
  return doServerActionWithAuth(serverAdmin(serverId), async (session) => {
    const rows = await getClient().plugins.findMany({
      where: {
        serverPlugins: { none: { serverId } },
        OR: [{ source: "marketplace" }, { source: "upload", ...uploadOwnerFilter(session) }],
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        source: true,
        versions: {
          where: { yanked: false },
          select: { id: true, version: true, sdk: true, manifest: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return rows
      .map((row): AvailablePlugin => {
        const source = row.source as PluginSourceKind;
        return {
          pluginId: row.id,
          slug: row.name,
          name: row.displayName ?? row.name,
          description: row.description,
          source,
          firstParty: source === "marketplace" && isFirstPartySlug(row.name),
          versions: row.versions
            .filter((version) => version.sdk <= PLUGIN_SDK_VERSION)
            .map((version) => ({
              id: version.id,
              version: version.version,
              capabilities: storedManifest(version.manifest)?.capabilities ?? [],
            }))
            .sort((a, b) => compareVersions(b.version, a.version)),
        };
      })
      .filter((plugin) => plugin.versions.length > 0)
      // First-party plugins first, the way the old built-in list showed them
      .sort((a, b) => Number(b.firstParty) - Number(a.firstParty));
  });
}

// Servers the user can install plugins on
export async function getInstallTargets(): Promise<ServerResponse<ServerSummary[]>> {
  return doServerActionWithAuth(routePermissions.plugins.view, (session) => getAdminServers(session));
}

// Name of the server and whether this panel reads a marketplace, for the server's Plugins page
export async function getServerPluginsContext(
  serverId: string,
): Promise<ServerResponse<{ serverName: string; marketplaceEnabled: boolean }>> {
  return doServerActionWithAuth(serverAdmin(serverId), async () => {
    const server = await getClient().servers.findUnique({
      where: { id: serverId },
      select: { name: true },
    });
    return { serverName: server?.name ?? "this server", marketplaceEnabled: !!marketplaceIndexUrl() };
  });
}
