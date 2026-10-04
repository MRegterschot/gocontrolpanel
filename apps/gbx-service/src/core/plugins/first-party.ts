import type { PluginPackage } from "@gcp/shared/plugin-package";
import type { Logger } from "../logger";
import type { FirstPartyInstall, FirstPartyRepository } from "../ports";

export interface FirstPartyPackage {
  pkg: PluginPackage;
  bytes: Uint8Array;
}

// Stores the plugins shipped with the service and moves installs from before the marketplace
// (built-in plugins without a version) onto them, keeping their settings. Runs on every start.
export async function installFirstPartyPlugins(
  packages: FirstPartyPackage[],
  repository: FirstPartyRepository,
  log: Logger,
): Promise<FirstPartyInstall[]> {
  const results: FirstPartyInstall[] = [];
  for (const { pkg, bytes } of packages) {
    try {
      const result = await repository.install(pkg.manifest, pkg.sha256, bytes);
      results.push(result);
      if (result.skipped) {
        log.warn({ ...result }, "Skipped a first-party plugin");
      } else if (result.stored || result.migrated > 0 || result.removed > 0) {
        log.info({ ...result }, "Installed a first-party plugin");
      }
    } catch (error) {
      log.error({ err: error, slug: pkg.manifest.slug }, "Failed to install a first-party plugin");
    }
  }
  return results;
}
