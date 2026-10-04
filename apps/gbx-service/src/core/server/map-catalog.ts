import type { SMapInfo } from "@tmcp/shared";
import type { Logger } from "../logger";
import type {
  Clock,
  MapMetadata,
  MapMetadataProvider,
  MapRecord,
  MapRepository,
} from "../ports";

const METADATA_REFRESH_HOURS = 72;

// Map rows plus best-effort Nadeo metadata (thumbnail, file url, submitter)
export class MapCatalog {
  constructor(
    private readonly maps: MapRepository,
    private readonly metadata: MapMetadataProvider,
    private readonly clock: Clock,
    private readonly log: Logger,
  ) {}

  async getOrCreate(info: SMapInfo): Promise<MapRecord> {
    const existing = await this.findByUid(info.UId);
    if (existing) return existing;

    // Maps that were never uploaded to Nadeo are still stored, just without metadata
    const metadata = await this.fetchMetadata(info.UId);
    return this.maps.create(
      {
        uid: info.UId,
        name: info.Name,
        fileName: info.FileName,
        author: info.Author,
        authorNickname: info.AuthorNickname,
        authorTime: info.AuthorTime,
        goldTime: info.GoldTime,
        silverTime: info.SilverTime,
        bronzeTime: info.BronzeTime,
      },
      metadata,
    );
  }

  async findByUid(uid: string): Promise<MapRecord | null> {
    const map = await this.maps.findByUid(uid);
    if (!map || !this.needsMetadataRefresh(map)) return map;

    const metadata = await this.fetchMetadata(uid);
    return this.maps.updateMetadata(map.id, metadata);
  }

  findByFileNames(fileNames: string[]): Promise<MapRecord[]> {
    if (fileNames.length === 0) return Promise.resolve([]);
    return this.maps.findByFileNames(fileNames);
  }

  private needsMetadataRefresh(map: MapRecord): boolean {
    if (map.thumbnailUrl) return false;
    if (!map.uploadCheck) return true;
    const threshold = this.clock.now() - METADATA_REFRESH_HOURS * 60 * 60 * 1000;
    return map.uploadCheck.getTime() < threshold;
  }

  private async fetchMetadata(uid: string): Promise<MapMetadata | null> {
    try {
      const result = await this.metadata.getMapsMetadata([uid]);
      return result.get(uid) ?? null;
    } catch (error) {
      this.log.warn({ err: error, uid }, "Failed to fetch map metadata");
      return null;
    }
  }
}
