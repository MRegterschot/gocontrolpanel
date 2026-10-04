import type { MapInfoMinimal, SMapInfo } from "@tmcp/shared";
import { AppError } from "../errors";
import type { GbxConnection } from "../gbx/connection";
import type { Logger } from "../logger";

const PAGE_SIZE = 100;

// Map list helpers on top of raw GBX calls
export class MapList {
  constructor(
    private readonly gbx: GbxConnection,
    private readonly log: Logger,
  ) {}

  async getAll(): Promise<MapInfoMinimal[]> {
    let all: MapInfoMinimal[] = [];
    let start = 0;

    while (true) {
      const batch = await this.gbx.call<MapInfoMinimal[]>("GetMapList", PAGE_SIZE, start);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < PAGE_SIZE) break;
      start += batch.length;
    }

    if (all.length === 0) {
      throw new AppError("GbxCallFailed", "Failed to retrieve map list from server");
    }
    return all;
  }

  // Sequential GetMapInfo; unknown files are logged and skipped
  async getInfos(fileNames: string[]): Promise<SMapInfo[]> {
    const infos: SMapInfo[] = [];
    for (const fileName of fileNames) {
      try {
        const info = await this.gbx.call<SMapInfo | undefined>("GetMapInfo", fileName);
        if (info) infos.push(info);
      } catch (error) {
        this.log.warn({ err: error, fileName }, "Failed to get map info");
      }
    }
    return infos;
  }

  // Makes the server's map list exactly fileNames, in that order
  async replace(fileNames: string[]): Promise<void> {
    await this.gbx.call("RemoveMapList", fileNames);

    const added = await this.gbx.call("AddMapList", fileNames);
    if (typeof added !== "number") {
      throw new AppError("AddMapListError", "Failed to add maps to map list");
    }

    const others = (await this.getAll())
      .map((map) => map.FileName)
      .filter((fileName) => !fileNames.includes(fileName));

    const removed = await this.gbx.call("RemoveMapList", others);
    if (typeof removed !== "number") {
      throw new AppError("RemoveMapListError", "Failed to remove maps from map list");
    }
  }

  async jumpTo(index: number): Promise<void> {
    await this.gbx.call("JumpToMapIndex", index);
  }

  async restart(): Promise<void> {
    await this.gbx.call("RestartMap");
  }
}
