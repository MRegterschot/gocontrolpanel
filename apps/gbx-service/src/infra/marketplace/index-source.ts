import {
  parseMarketplaceIndex,
  readBodyLimited,
  type MarketplaceIndex,
} from "@tmcontrolpanel/shared";
import type { Logger } from "../../core/logger";
import type { MarketplaceIndexSource } from "../../core/plugins/marketplace-watcher";

const MAX_INDEX_BYTES = 5 * 1024 * 1024;

export class HttpMarketplaceIndexSource implements MarketplaceIndexSource {
  constructor(
    private readonly url: string,
    private readonly log: Logger,
  ) {}

  async fetch(): Promise<MarketplaceIndex> {
    const response = await fetch(this.url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error(`Marketplace index answered ${response.status}`);

    const text = new TextDecoder().decode(
      await readBodyLimited(response, MAX_INDEX_BYTES),
    );

    const { index, skipped } = parseMarketplaceIndex(JSON.parse(text));
    if (skipped > 0)
      this.log.warn({ skipped }, "Skipped invalid marketplace entries");
    return index;
  }
}
