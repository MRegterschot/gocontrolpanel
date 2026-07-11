import { SMapInfo } from "@/types/gbx/map";
import { MapInfoMinimal } from "@/types/map";
import { GbxClient } from "@evotm/gbxclient";

export async function setMapList(client: GbxClient, filenames: string[]) {
  await client.call("RemoveMapList", filenames);

  const addedMaps = await client.call("AddMapList", filenames);
  
  const allMapList = await getMapList(client);

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

export async function jumpToMapIndex(client: GbxClient, index: number) {
  await client.call("JumpToMapIndex", index);
}

export async function restartMap(client: GbxClient) {
  await client.call("RestartMap");
}

export async function getMapsInfo(
  client: GbxClient,
  filenames: string[],
): Promise<SMapInfo[]> {
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

export async function getMapList(client: GbxClient): Promise<MapInfoMinimal[]> {
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

  return allMapList;
}
