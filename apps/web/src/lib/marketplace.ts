import {
  parseMarketplaceIndex,
  resolveMarketplaceUrl,
  type MarketplaceIndex,
  type MarketplacePlugin,
  type MarketplaceVersion,
} from "@gcp/shared";
import { readPluginPackage, sha256Hex, type PluginPackage } from "@gcp/shared/plugin-package";
import "server-only";
import config from "./config";
import { logger } from "./logger";

// Reads the plugin marketplace (a GitHub repository published to GitHub Pages). Everything is
// fetched from the origin of the index only, and packages must match their sha256.

const INDEX_TTL_MS = 5 * 60 * 1000;
const README_TTL_MS = 30 * 60 * 1000;
const MAX_INDEX_BYTES = 5 * 1024 * 1024;
const MAX_README_BYTES = 200 * 1024;
const MAX_PACKAGE_BYTES = 5 * 1024 * 1024;

const meta = { type: "marketplace", module: "marketplace" };

let cached: { index: MarketplaceIndex; at: number } | null = null;
const readmes = new Map<string, { text: string | null; at: number }>();

export class MarketplaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketplaceError";
  }
}

export function marketplaceIndexUrl(): string | null {
  return config.MARKETPLACE.INDEX_URL || null;
}

async function fetchLimited(url: string, maxBytes: number, timeoutMs: number): Promise<Uint8Array> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new MarketplaceError(`The marketplace answered ${response.status} for ${url}`);
  }
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new MarketplaceError(`${url} is too large`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new MarketplaceError(`${url} is too large`);
  return bytes;
}

// The cached index, refreshed every few minutes. A failed refresh keeps serving the last copy.
export async function getMarketplaceIndex(): Promise<MarketplaceIndex | null> {
  const url = marketplaceIndexUrl();
  if (!url) return null;
  if (cached && Date.now() - cached.at < INDEX_TTL_MS) return cached.index;

  try {
    const bytes = await fetchLimited(url, MAX_INDEX_BYTES, 15_000);
    const { index, skipped } = parseMarketplaceIndex(JSON.parse(new TextDecoder().decode(bytes)));
    if (skipped > 0) {
      logger.warn({ meta: { ...meta, function: "getMarketplaceIndex" }, skipped }, "Skipped invalid marketplace entries");
    }
    cached = { index, at: Date.now() };
    return index;
  } catch (error) {
    logger.error({ meta: { ...meta, function: "getMarketplaceIndex" }, error }, "Failed to load the marketplace");
    if (cached) return cached.index;
    throw error instanceof MarketplaceError
      ? error
      : new MarketplaceError("The plugin marketplace can't be reached right now");
  }
}

export function findMarketplacePlugin(
  index: MarketplaceIndex,
  slug: string,
): MarketplacePlugin | null {
  return index.plugins.find((plugin) => plugin.slug === slug) ?? null;
}

// Absolute URL of something the index refers to; null when it points off the index's origin
export function marketplaceUrl(ref: string | undefined): string | null {
  const url = marketplaceIndexUrl();
  return url && ref ? resolveMarketplaceUrl(url, ref) : null;
}

export async function getMarketplaceReadme(plugin: MarketplacePlugin): Promise<string | null> {
  const url = marketplaceUrl(plugin.readme);
  if (!url) return null;

  const hit = readmes.get(url);
  if (hit && Date.now() - hit.at < README_TTL_MS) return hit.text;

  let text: string | null = null;
  try {
    text = new TextDecoder().decode(await fetchLimited(url, MAX_README_BYTES, 10_000));
  } catch (error) {
    logger.warn({ meta: { ...meta, function: "getMarketplaceReadme" }, error, url }, "Failed to load a README");
  }
  readmes.set(url, { text, at: Date.now() });
  return text;
}

// Downloads a version and checks it is exactly what the index promises
export async function downloadMarketplacePackage(
  plugin: MarketplacePlugin,
  version: MarketplaceVersion,
): Promise<{ bytes: Uint8Array; pkg: PluginPackage }> {
  const url = marketplaceUrl(version.url);
  if (!url) throw new MarketplaceError("The package is not hosted by the marketplace");

  const bytes = await fetchLimited(url, MAX_PACKAGE_BYTES, 30_000);
  if (sha256Hex(bytes) !== version.sha256) {
    throw new MarketplaceError("The downloaded package does not match the marketplace's checksum");
  }

  const pkg = readPluginPackage(bytes);
  const { manifest } = pkg;
  const sameCapabilities =
    [...manifest.capabilities].sort().join() === [...version.capabilities].sort().join();
  if (
    manifest.slug !== plugin.slug ||
    manifest.version !== version.version ||
    manifest.sdk !== version.sdk ||
    !sameCapabilities
  ) {
    throw new MarketplaceError("The package does not match its marketplace entry");
  }
  return { bytes, pkg };
}

// For tests
export function clearMarketplaceCache(): void {
  cached = null;
  readmes.clear();
}
