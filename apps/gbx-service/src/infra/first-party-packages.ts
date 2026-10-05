import { isFirstPartySlug, resolveMarketplaceUrl } from "@gcp/shared";
import { readPluginPackage, sha256Hex } from "@gcp/shared/plugin-package";
import type { Logger } from "../core/logger";
import type { FirstPartyPackage } from "../core/plugins/first-party";
import { HttpMarketplaceIndexSource } from "./marketplace/index-source";

const MAX_PACKAGE_BYTES = 5 * 1024 * 1024;

// First-party sources and immutable packages live in the registry, not the service image.
// Importing them preserves the migration of old built-in installs and their settings.
export async function loadFirstPartyPackages(
  indexUrl: string,
  log: Logger,
): Promise<FirstPartyPackage[]> {
  if (!indexUrl) return [];
  try {
    const index = await new HttpMarketplaceIndexSource(indexUrl, log).fetch();
    const packages = await Promise.all(
      index.plugins
        .filter((plugin) => isFirstPartySlug(plugin.slug))
        .map(async (plugin): Promise<FirstPartyPackage | null> => {
          const version = plugin.versions.find((version) => !version.yanked);
          if (!version) return null;
          try {
            const url = resolveMarketplaceUrl(indexUrl, version.url);
            if (!url)
              throw new Error(
                "First-party package is not hosted by the registry",
              );
            const response = await fetch(url, {
              signal: AbortSignal.timeout(30_000),
            });
            if (!response.ok)
              throw new Error(
                `First-party package answered ${response.status}`,
              );
            if (
              Number(response.headers.get("content-length") ?? 0) >
              MAX_PACKAGE_BYTES
            ) {
              throw new Error("First-party package is too large");
            }
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.byteLength > MAX_PACKAGE_BYTES)
              throw new Error("First-party package is too large");
            if (sha256Hex(bytes) !== version.sha256)
              throw new Error(
                "First-party package checksum does not match the registry",
              );
            const pkg = readPluginPackage(bytes);
            if (
              pkg.manifest.slug !== plugin.slug ||
              pkg.manifest.version !== version.version ||
              pkg.manifest.sdk !== version.sdk ||
              bytes.byteLength !== version.size ||
              [...pkg.manifest.capabilities].sort().join() !==
                [...version.capabilities].sort().join()
            ) {
              throw new Error(
                "First-party package does not match its registry entry",
              );
            }
            return { pkg, bytes };
          } catch (error) {
            log.error(
              { err: error, slug: plugin.slug },
              "Could not load a first-party package from the registry",
            );
            return null;
          }
        }),
    );
    return packages.filter((pkg): pkg is FirstPartyPackage => pkg !== null);
  } catch (error) {
    // Previously installed packages remain in the database and run without registry access.
    log.warn(
      { err: error },
      "Could not load first-party packages; keeping previously installed versions",
    );
    return [];
  }
}
