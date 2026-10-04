import type { MarketplaceIndex } from "@gcp/shared";
import type { Logger } from "../logger";
import type { Clock, PluginCatalogRepository, PluginYank, YankedInstall } from "../ports";

export interface MarketplaceIndexSource {
  fetch(): Promise<MarketplaceIndex>;
}

export interface MarketplaceWatcherOptions {
  source: MarketplaceIndexSource;
  catalog: PluginCatalogRepository;
  // Turns the plugin off on a server this instance runs and tells its admins
  disable(install: YankedInstall, reason: string): Promise<void>;
  clock: Clock;
  log: Logger;
  intervalMs: number;
}

// Takedowns (PM-15): versions the marketplace marks as yanked are turned off on every server
export class MarketplaceWatcher {
  private timer: unknown = null;
  private stopped = false;

  constructor(private readonly options: MarketplaceWatcherOptions) {}

  // `immediate: false` when the caller already ran the first check
  start(immediate = true): void {
    this.stopped = false;
    if (immediate) {
      void this.tick();
    } else {
      this.timer = this.options.clock.setTimeout(() => void this.tick(), this.options.intervalMs);
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) this.options.clock.clearTimeout(this.timer);
    this.timer = null;
  }

  async check(): Promise<YankedInstall[]> {
    const index = await this.options.source.fetch();
    const yanks: PluginYank[] = index.plugins.flatMap((plugin) =>
      plugin.versions
        .filter((version) => version.yanked)
        .map((version) => ({
          slug: plugin.slug,
          version: version.version,
          reason: version.yankReason ?? null,
        })),
    );
    if (yanks.length === 0) return [];

    const affected = await this.options.catalog.applyYanks(yanks);
    for (const install of affected) {
      const reason = `Version ${install.version} was withdrawn from the marketplace${
        install.reason ? `: ${install.reason}` : ""
      }`;
      this.options.log.warn({ ...install }, "Turned off a yanked plugin");
      await this.options.disable(install, reason).catch((error) =>
        this.options.log.error({ err: error, ...install }, "Failed to unload a yanked plugin"),
      );
    }
    return affected;
  }

  private async tick(): Promise<void> {
    try {
      await this.check();
    } catch (error) {
      this.options.log.warn({ err: error }, "Could not check the plugin marketplace");
    }
    if (!this.stopped) {
      this.timer = this.options.clock.setTimeout(() => void this.tick(), this.options.intervalMs);
    }
  }
}
