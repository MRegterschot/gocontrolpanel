import { getGbxClient } from "@/lib/managers/gbxclient-manager";
import { SMapInfo } from "@/types/gbx/map";
import { MapInfoMinimal } from "@/types/map";

export async function setMapList(serverId: string, filenames: string[]) {
  const client = await getGbxClient(serverId);
  const pageSize = 100;
  let allMapList: MapInfoMinimal[] = [];

  let currentStart = 0;
  while (true) {
    const batch: MapInfoMinimal[] = await client.call(
      "GetMapList",
      pageSize,
      currentStart,
    );
    if (!batch || batch.length === 0) break;

    allMapList = allMapList.concat(batch);
    if (batch.length < pageSize) break; // No more pages

    currentStart += batch.length;
  }

  if (!allMapList || allMapList.length === 0)
    throw new Error("Failed to retrieve map list from server");

  const addedMaps = await client.call("AddMapList", filenames);

  if (typeof addedMaps !== "number")
    throw new Error("Failed to add maps to map list");

  const removedMaps = await client.call(
    "RemoveMapList",
    allMapList
      .map((map) => map.FileName)
      .filter((fileName) => !filenames.includes(fileName)),
  );

  if (typeof removedMaps !== "number")
    throw new Error("Failed to remove maps from map list");
}

export async function jumpToMapIndex(serverId: string, index: number) {
  const client = await getGbxClient(serverId);
  await client.call("JumpToMapIndex", index);
}

export async function restartMap(serverId: string) {
  const client = await getGbxClient(serverId);
  await client.call("RestartMap");
}

export async function getMapsInfo(
  serverId: string,
  filenames: string[],
): Promise<SMapInfo[]> {
  const client = await getGbxClient(serverId);
  const mapsInfo: SMapInfo[] = [];

  for (const filename of filenames) {
    try {
      const mapInfo: SMapInfo = await client.call("GetMapInfo", filename);
      mapsInfo.push(mapInfo);
    } catch (error) {
      console.error(`Failed to get map info for ${filename}:`, error);
    }
  }

  return mapsInfo;
}
