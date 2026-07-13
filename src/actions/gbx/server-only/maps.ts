import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import { SMapInfo } from "@/types/gbx/map";
import { MapInfoMinimal } from "@/types/map";

export async function setMapList(
  manager: GbxClientManager,
  filenames: string[],
) {
  const meta = {
    type: "gbx",
    module: "game",
    function: "setMapList",
  };
  await manager.client.call("RemoveMapList", filenames);

  const addedMaps = await manager.client.call("AddMapList", filenames);

  if (typeof addedMaps !== "number") {
    manager.log.error(
      { meta, filenames, addedMaps },
      "Failed to add maps to map list",
    );
    throw new Error("Failed to add maps to map list");
  }

  const allMapList = await getMapList(manager);

  const removedMaps = await manager.client.call(
    "RemoveMapList",
    allMapList
      .map((map) => map.FileName)
      .filter((fileName) => !filenames.includes(fileName)),
  );

  if (typeof removedMaps !== "number") {
    manager.log.error(
      { meta, filenames, removedMaps },
      "Failed to remove maps from map list",
    );
    throw new Error("Failed to remove maps from map list");
  }
}

export async function jumpToMapIndex(manager: GbxClientManager, index: number) {
  await manager.client.call("JumpToMapIndex", index);
}

export async function restartMap(manager: GbxClientManager) {
  await manager.client.call("RestartMap");
}

export async function getMapsInfo(
  manager: GbxClientManager,
  filenames: string[],
): Promise<SMapInfo[]> {
  const meta = {
    type: "gbx",
    module: "game",
    function: "getMapsInfo",
  };
  const mapsInfo: SMapInfo[] = [];

  for (const filename of filenames) {
    try {
      const mapInfo: SMapInfo = await manager.client.call(
        "GetMapInfo",
        filename,
      );
      mapsInfo.push(mapInfo);
    } catch (error) {
      manager.log.error({ meta, error, filename }, "Failed to get map info");
    }
  }

  return mapsInfo;
}

export async function getMapList(
  manager: GbxClientManager,
): Promise<MapInfoMinimal[]> {
  const meta = {
    type: "gbx",
    module: "game",
    function: "getMapList",
  };
  const pageSize = 100;
  let allMapList: MapInfoMinimal[] = [];

  let currentStart = 0;
  while (true) {
    const batch: MapInfoMinimal[] = await manager.client.call(
      "GetMapList",
      pageSize,
      currentStart,
    );
    if (!batch || batch.length === 0) break;

    allMapList = allMapList.concat(batch);
    if (batch.length < pageSize) break; // No more pages

    currentStart += batch.length;
  }

  if (!allMapList || allMapList.length === 0) {
    manager.log.error({ meta }, "Failed to retrieve map list from server");
    throw new Error("Failed to retrieve map list from server");
  }

  return allMapList;
}
