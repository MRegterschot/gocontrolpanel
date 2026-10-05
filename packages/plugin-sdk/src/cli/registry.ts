import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import {
  compareVersions,
  isReservedSlug,
  isValidVersion,
  MARKETPLACE_SCHEMA_VERSION,
  parseMarketplaceIndex,
  PLUGIN_SLUG,
  type MarketplaceIndex,
  type MarketplacePlugin,
  type MarketplaceVersion,
} from "@tmcp/shared";
import { PluginPackageError, readPluginPackage, sha256Hex, type PluginPackage } from "@tmcp/shared/plugin-package";
import { z } from "zod";

// Builds the marketplace site from a registry repository:
//
//   registry.json                         { name, repository }
//   plugins/<slug>/plugin.json            { tags, screenshots } (optional)
//   plugins/<slug>/versions/<ver>.json    { url, sha256, publishedAt, changelog?, yanked?, yankReason? }
//
// Every package is downloaded, checked against its sha256 and read with the same validator
// panels use. The output is index.json plus a copy of every package, README and icon, ready
// for GitHub Pages; panels only download from the origin of the index.

const registrySchema = z
  .object({
    name: z.string().max(100).optional(),
    repository: z.string().url().max(300).optional(),
  })
  .strict();

const pluginFileSchema = z
  .object({
    tags: z.array(z.string().regex(/^[a-z0-9-]{1,24}$/)).max(10).optional(),
    // Images in the plugin folder
    screenshots: z.array(z.string().regex(/^[A-Za-z0-9_\-/]+\.(png|jpe?g)$/)).max(6).optional(),
  })
  .strict();

const versionFileSchema = z
  .object({
    // An https:// release asset, or a path relative to this file
    url: z.string().min(1).max(500),
    sha256: z.string().regex(/^[a-f0-9]{64}$/, "Must be a lowercase hex sha256"),
    publishedAt: z.string().datetime({ offset: true }),
    changelog: z.string().max(5000).optional(),
    yanked: z.boolean().optional(),
    yankReason: z.string().max(500).optional(),
  })
  .strict();

const MAX_DOWNLOAD = 5 * 1024 * 1024;

export interface RegistryBuildOptions {
  registry: string;
  out: string;
  // Validate only, write nothing
  check?: boolean;
  fetchBytes?: (url: string) => Promise<Uint8Array>;
  now?: () => Date;
}

export interface RegistryBuildResult {
  index: MarketplaceIndex;
  errors: string[];
}

function readJson<T>(file: string, schema: z.ZodType<T>, errors: string[]): T | null {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    errors.push(`${file}: not valid JSON`);
    return null;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${file}: ${issue.path.join(".") || "file"}: ${issue.message}`);
    }
    return null;
  }
  return result.data;
}

async function download(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_DOWNLOAD) throw new Error("larger than 5 MB");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_DOWNLOAD) throw new Error("larger than 5 MB");
  return bytes;
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join("\n") === [...b].sort().join("\n");

export async function buildRegistry(options: RegistryBuildOptions): Promise<RegistryBuildResult> {
  const root = resolve(options.registry);
  const out = resolve(options.out);
  const fetchBytes = options.fetchBytes ?? download;
  const errors: string[] = [];
  const plugins: MarketplacePlugin[] = [];
  const writes: [string, Uint8Array | string][] = [];

  const registryFile = join(root, "registry.json");
  const registry = existsSync(registryFile) ? readJson(registryFile, registrySchema, errors) : {};

  const pluginsDir = join(root, "plugins");
  const slugs = existsSync(pluginsDir)
    ? readdirSync(pluginsDir).filter((name) => statSync(join(pluginsDir, name)).isDirectory()).sort()
    : [];

  for (const slug of slugs) {
    const dir = join(pluginsDir, slug);
    if (!PLUGIN_SLUG.test(slug) || isReservedSlug(slug) || slug.includes("--")) {
      errors.push(`plugins/${slug}: not a valid plugin slug`);
      continue;
    }

    const pluginFile = join(dir, "plugin.json");
    const meta = existsSync(pluginFile) ? readJson(pluginFile, pluginFileSchema, errors) ?? {} : {};

    const versionsDir = join(dir, "versions");
    const files = existsSync(versionsDir)
      ? readdirSync(versionsDir).filter((name) => name.endsWith(".json"))
      : [];
    if (files.length === 0) {
      errors.push(`plugins/${slug}: no versions`);
      continue;
    }

    const versions: { entry: MarketplaceVersion; pkg: PluginPackage }[] = [];
    for (const file of files) {
      const version = file.slice(0, -".json".length);
      const where = `plugins/${slug}/versions/${file}`;
      if (!isValidVersion(version)) {
        errors.push(`${where}: the file name must be a version like 1.2.3.json`);
        continue;
      }
      const spec = readJson(join(versionsDir, file), versionFileSchema, errors);
      if (!spec) continue;

      let bytes: Uint8Array;
      try {
        if (spec.url.startsWith("https://")) {
          bytes = await fetchBytes(spec.url);
        } else if (/^[a-z]+:/i.test(spec.url)) {
          throw new Error("only https:// URLs or paths in the registry are allowed");
        } else {
          const local = resolve(versionsDir, spec.url);
          if (!local.startsWith(root)) throw new Error("path leaves the registry");
          bytes = new Uint8Array(readFileSync(local));
        }
      } catch (error) {
        errors.push(`${where}: could not get ${spec.url}: ${(error as Error).message}`);
        continue;
      }

      const sha256 = sha256Hex(bytes);
      if (sha256 !== spec.sha256) {
        errors.push(`${where}: sha256 is ${sha256}, the file says ${spec.sha256}`);
        continue;
      }

      let pkg: PluginPackage;
      try {
        pkg = readPluginPackage(bytes);
      } catch (error) {
        const issues = error instanceof PluginPackageError ? error.issues : [(error as Error).message];
        errors.push(...issues.map((issue) => `${where}: ${issue}`));
        continue;
      }
      if (pkg.manifest.slug !== slug) {
        errors.push(`${where}: the package is "${pkg.manifest.slug}", not "${slug}"`);
        continue;
      }
      if (pkg.manifest.version !== version) {
        errors.push(`${where}: the package is version ${pkg.manifest.version}, not ${version}`);
        continue;
      }

      const packagePath = `packages/${slug}/${slug}-${version}.zip`;
      writes.push([packagePath, bytes]);
      versions.push({
        pkg,
        entry: {
          version,
          sdk: pkg.manifest.sdk,
          url: packagePath,
          sha256,
          size: bytes.byteLength,
          capabilities: pkg.manifest.capabilities,
          gamemodes: pkg.manifest.gamemodes,
          commands: pkg.manifest.commands,
          publishedAt: spec.publishedAt,
          changelog: spec.changelog,
          yanked: spec.yanked ?? false,
          yankReason: spec.yankReason,
        },
      });
    }
    if (versions.length === 0) continue;

    versions.sort((a, b) => compareVersions(b.entry.version, a.entry.version));
    const latest = versions.find((v) => !v.entry.yanked) ?? versions[0];
    const { manifest } = latest.pkg;

    let readme: string | undefined;
    if (latest.pkg.readme) {
      readme = `packages/${slug}/README.md`;
      writes.push([readme, latest.pkg.readme]);
    }
    let icon: string | undefined;
    if (latest.pkg.icon) {
      icon = `packages/${slug}/icon.png`;
      writes.push([icon, latest.pkg.icon]);
    }
    const screenshots: string[] = [];
    for (const screenshot of meta.screenshots ?? []) {
      const file = join(dir, screenshot);
      if (!existsSync(file)) {
        errors.push(`plugins/${slug}/plugin.json: screenshot ${screenshot} not found`);
        continue;
      }
      const path = `packages/${slug}/screenshots/${screenshots.length + 1}${extname(screenshot)}`;
      writes.push([path, new Uint8Array(readFileSync(file))]);
      screenshots.push(path);
    }

    plugins.push({
      slug,
      name: manifest.name,
      description: manifest.description,
      author: manifest.author,
      license: manifest.license,
      repository: manifest.repository,
      homepage: manifest.homepage,
      tags: meta.tags ?? [],
      icon,
      readme,
      screenshots,
      versions: versions.map((v) => v.entry),
    });
  }

  const index: MarketplaceIndex = {
    schemaVersion: MARKETPLACE_SCHEMA_VERSION,
    name: registry?.name,
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    repository: registry?.repository,
    plugins,
  };

  // What panels read must parse with the panels' own schema
  const { skipped } = parseMarketplaceIndex(JSON.parse(JSON.stringify(index)));
  if (skipped > 0) errors.push(`${skipped} plugin entries do not match the index schema`);

  if (!options.check && errors.length === 0) {
    for (const [path, content] of writes) {
      const file = join(out, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content);
    }
    writeFileSync(join(out, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
    writeFileSync(join(out, "index.html"), indexPage(index));
  }

  return { index, errors };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// A plain listing for people who open the site in a browser
function indexPage(index: MarketplaceIndex): string {
  const rows = index.plugins
    .map((plugin) => {
      const latest = plugin.versions.find((v) => !v.yanked) ?? plugin.versions[0];
      return `<li><strong>${escapeHtml(plugin.name)}</strong> ${escapeHtml(latest.version)} by ${escapeHtml(plugin.author)}<br>${escapeHtml(plugin.description)}</li>`;
    })
    .join("\n");
  const title = escapeHtml(index.name ?? "TMControlPanel plugins");
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 48rem; margin: 2rem auto; padding: 0 1rem">
<h1>${title}</h1>
<p>Plugins for <a href="https://github.com/MRegterschot/tmcontrolpanel">TMControlPanel</a>. Install them from the Plugins page of your panel. Panels read <a href="index.json">index.json</a>.</p>
<ul>
${rows}
</ul>
</body>
</html>
`;
}
