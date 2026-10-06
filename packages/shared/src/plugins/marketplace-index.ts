import { z } from "zod";
import { GAME_MODE_TYPES } from "../types/live";
import { isCapability, PLUGIN_SDK_VERSION } from "./capabilities";
import { PLUGIN_COMMAND, PLUGIN_SLUG } from "./manifest";
import { compareVersions, isPrerelease, isValidVersion } from "./version";

// index.json of the plugin marketplace: a GitHub repository whose pull requests are the
// review, published to GitHub Pages together with a copy of every package. Panels only
// download packages from the origin the index is served from, and check their sha256.

export const MARKETPLACE_SCHEMA_VERSION = 1;
export const DEFAULT_MARKETPLACE_INDEX_URL =
  "https://mregterschot.github.io/tmcontrolpanel-plugins/index.json";

// Relative to the index, or an absolute https URL
const reference = z.string().min(1).max(500);

export const marketplaceVersionSchema = z.object({
  version: z.string().refine(isValidVersion, "Invalid version"),
  sdk: z.number().int().min(1),
  url: reference,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size: z.number().int().positive(),
  capabilities: z.array(z.string().refine(isCapability)).default([]),
  gamemodes: z.array(z.enum(GAME_MODE_TYPES)).default([]),
  commands: z.array(z.string().regex(PLUGIN_COMMAND)).default([]),
  publishedAt: z.string().datetime({ offset: true }),
  changelog: z.string().max(5000).optional(),
  yanked: z.boolean().default(false),
  yankReason: z.string().max(500).optional(),
});

export type MarketplaceVersion = z.infer<typeof marketplaceVersionSchema>;

export const marketplacePluginSchema = z.object({
  slug: z.string().regex(PLUGIN_SLUG),
  name: z.string().min(1).max(60),
  description: z.string().min(1).max(300),
  author: z.string().min(1).max(100),
  license: z.string().max(100).optional(),
  repository: z.string().url().max(300).optional(),
  homepage: z.string().url().max(300).optional(),
  tags: z.array(z.string().regex(/^[a-z0-9-]{1,24}$/)).max(10).default([]),
  icon: reference.optional(),
  readme: reference.optional(),
  screenshots: z.array(reference).max(6).default([]),
  versions: z.array(marketplaceVersionSchema).min(1).max(500),
});

export type MarketplacePlugin = z.infer<typeof marketplacePluginSchema>;

export const marketplaceIndexSchema = z.object({
  schemaVersion: z.literal(MARKETPLACE_SCHEMA_VERSION),
  name: z.string().max(100).optional(),
  generatedAt: z.string().datetime({ offset: true }),
  // Registry repository, for "report" and "publish" links
  repository: z.string().url().max(300).optional(),
  plugins: z.array(marketplacePluginSchema).max(5000),
});

export type MarketplaceIndex = z.infer<typeof marketplaceIndexSchema>;

const indexEnvelope = z.object({
  schemaVersion: z.literal(MARKETPLACE_SCHEMA_VERSION),
  name: z.string().max(100).optional(),
  generatedAt: z.string().datetime({ offset: true }),
  repository: z.string().url().max(300).optional(),
  plugins: z.array(z.unknown()).max(5000),
});

// One broken entry must not take the whole marketplace down, so plugins are checked one by one
export function parseMarketplaceIndex(raw: unknown): { index: MarketplaceIndex; skipped: number } {
  const envelope = indexEnvelope.parse(raw);
  const plugins: MarketplacePlugin[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const entry of envelope.plugins) {
    const result = marketplacePluginSchema.safeParse(entry);
    if (!result.success || seen.has(result.data.slug)) {
      skipped++;
      continue;
    }
    seen.add(result.data.slug);
    plugins.push({
      ...result.data,
      versions: [...result.data.versions].sort((a, b) => compareVersions(b.version, a.version)),
    });
  }

  return { index: { ...envelope, plugins }, skipped };
}

// Resolves a reference from the index. Anything outside the index's origin is refused, so a
// panel never downloads from hosts the index merely points at.
export function resolveMarketplaceUrl(indexUrl: string, ref: string): string | null {
  try {
    const base = new URL(indexUrl);
    const target = new URL(ref, base);
    return target.origin === base.origin ? target.toString() : null;
  } catch {
    return null;
  }
}

export function isVersionCompatible(
  version: MarketplaceVersion,
  sdk: number = PLUGIN_SDK_VERSION,
): boolean {
  return version.sdk <= sdk;
}

// Newest installable version: not yanked, a supported SDK, and a release unless only
// pre-releases exist
export function latestVersion(
  plugin: MarketplacePlugin,
  sdk: number = PLUGIN_SDK_VERSION,
): MarketplaceVersion | null {
  const candidates = plugin.versions
    .filter((v) => !v.yanked && isVersionCompatible(v, sdk))
    .sort((a, b) => compareVersions(b.version, a.version));
  return candidates.find((v) => !isPrerelease(v.version)) ?? candidates[0] ?? null;
}

export function findVersion(
  plugin: MarketplacePlugin,
  version: string,
): MarketplaceVersion | null {
  return plugin.versions.find((v) => v.version === version) ?? null;
}

export function reportPluginUrl(index: MarketplaceIndex, slug: string): string | null {
  if (!index.repository?.startsWith("https://github.com/")) return null;
  const params = new URLSearchParams({ template: "report.yml", title: `Report: ${slug}` });
  return `${index.repository.replace(/\/$/, "")}/issues/new?${params}`;
}
