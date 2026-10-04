import { PLUGIN_SDK_VERSION } from "@gcp/shared";
import { readPluginPackage, type PluginPackage } from "@gcp/shared/plugin-package";
import type { PluginPackageRepository, ServerPluginRecord } from "../../ports";
import type { PluginDefinition } from "../sdk";
import { sandboxedDefinition, type SandboxDependencies } from "./sandboxed-plugin";

const MAX_CACHED = 100;

// Turns installed package versions into plugin definitions. Parsed packages are cached by
// sha256, which also proves the stored bytes are the ones that were installed.
export class PackageLoader {
  private readonly cache = new Map<string, PluginPackage>();

  constructor(
    private readonly packages: PluginPackageRepository,
    private readonly deps: SandboxDependencies,
  ) {}

  async resolve(record: ServerPluginRecord): Promise<PluginDefinition<unknown> | null> {
    const ref = record.package;
    if (!ref) return null;
    if (ref.yanked) {
      throw new Error(`${record.name}@${ref.version} was withdrawn from the marketplace`);
    }

    let pkg = this.cache.get(ref.sha256);
    if (!pkg) {
      const bytes = await this.packages.loadPackage(ref.versionId);
      if (!bytes) throw new Error(`Package ${record.name}@${ref.version} is missing from the database`);

      pkg = readPluginPackage(bytes);
      if (pkg.sha256 !== ref.sha256) {
        throw new Error(`Package ${record.name}@${ref.version} does not match its checksum`);
      }
      this.remember(ref.sha256, pkg);
    }

    if (pkg.manifest.slug !== record.name) {
      throw new Error(`Package ${pkg.manifest.slug} is installed as ${record.name}`);
    }
    if (pkg.manifest.sdk > PLUGIN_SDK_VERSION) {
      throw new Error(
        `${record.name}@${ref.version} needs plugin SDK ${pkg.manifest.sdk}, this service runs ${PLUGIN_SDK_VERSION}`,
      );
    }
    return sandboxedDefinition(pkg, { ...record, package: ref }, this.deps);
  }

  private remember(sha256: string, pkg: PluginPackage): void {
    if (this.cache.size >= MAX_CACHED) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(sha256, pkg);
  }
}
