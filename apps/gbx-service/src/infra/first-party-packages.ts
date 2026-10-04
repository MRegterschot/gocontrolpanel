import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readPluginPackage } from "@gcp/shared/plugin-package";
import type { Logger } from "../core/logger";
import type { FirstPartyPackage } from "../core/plugins/first-party";

// The packages built from plugins/ (plugins/scripts/build.ts) and shipped in the image
export function loadFirstPartyPackages(dir: string, log: Logger): FirstPartyPackage[] {
  if (!existsSync(dir)) {
    log.warn(
      { dir },
      "No first-party plugins found; build them with: bun run --filter @gcp/first-party-plugins build",
    );
    return [];
  }

  const packages: FirstPartyPackage[] = [];
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".zip")).sort()) {
    try {
      const bytes = new Uint8Array(readFileSync(join(dir, file)));
      packages.push({ pkg: readPluginPackage(bytes), bytes });
    } catch (error) {
      log.error({ err: error, file }, "Invalid first-party plugin package");
    }
  }
  return packages;
}
