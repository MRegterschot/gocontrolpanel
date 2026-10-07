import { getMapsInfo } from "@/lib/api/nadeo";
import { getClient } from "@/lib/dbclient";
import { callEach } from "@/lib/gbx-batch";
import { getGbxClient } from "@/lib/gbx-service";
import { getLogger } from "@/lib/logger";
import { Maps } from "@gcp/db";
import { MapInfoMinimal, SMapInfo } from "@gcp/shared";
import "server-only";
import { checkAndUpdateMapsInfoIfNeeded } from "./gbx";

export async function getMapByUidServer(uid: string): Promise<Maps | null> {
  const db = getClient();

  const map = await db.maps.findFirst({
    where: { uid, deletedAt: null },
  });

  if (!map) {
    return null;
  }

  const [updatedMap] = await checkAndUpdateMapsInfoIfNeeded([map]);

  return updatedMap;
}

export async function getMapsByFileNames(fileNames: string[]): Promise<Maps[]> {
  if (fileNames.length === 0) {
    return [];
  }

  const db = getClient();

  return await db.maps.findMany({
    where: { fileName: { in: fileNames }, deletedAt: null },
  });
}

// Creates rows for maps that are on the server but not in the database yet: the dedicated
// server's map info plus the Nadeo API info. Returns the rows that were created.
export async function createMissingMaps(
  serverId: string,
  missingMaps: MapInfoMinimal[],
): Promise<Maps[]> {
  const meta = {
    type: "database",
    module: "maps",
    function: "createMissingMaps",
  };
  const log = getLogger(serverId);
  const client = getGbxClient(serverId);
  const db = getClient();
  const BATCH_SIZE = 200;
  const now = new Date();
  const newMaps: Maps[] = [];

  const apiMapsInfo: NonNullable<
    Awaited<ReturnType<typeof getMapsInfo>>["data"]
  > = [];
  for (let i = 0; i < missingMaps.length; i += BATCH_SIZE) {
    const batch = missingMaps.slice(i, i + BATCH_SIZE).map((map) => map.UId);
    const { data } = await getMapsInfo(batch);
    if (data) apiMapsInfo.push(...data);
  }

  const mapInfos = await callEach<SMapInfo>(
    client,
    "GetMapInfo",
    missingMaps.map((map) => [map.FileName]),
  );

  missingMaps.forEach((map, i) => {
    const mapInfo = mapInfos[i];
    if (!mapInfo) {
      log.error({ meta, map }, "Failed to get map info");
      return;
    }

    if (newMaps.some((m) => m.uid === mapInfo.UId)) {
      log.warn({ meta, mapInfo }, "Duplicate map UID found");
      return;
    }

    const mapInfoFromApi = apiMapsInfo.find((m) => m.mapUid === map.UId);
    newMaps.push({
      id: crypto.randomUUID(),
      name: mapInfo.Name || "Unknown",
      uid: mapInfo.UId,
      fileName: mapInfo.FileName || "",
      author: mapInfo.Author || "",
      authorNickname: mapInfo.AuthorNickname || "",
      authorTime: mapInfo.AuthorTime || 0,
      goldTime: mapInfo.GoldTime || 0,
      silverTime: mapInfo.SilverTime || 0,
      bronzeTime: mapInfo.BronzeTime || 0,
      submitter: mapInfoFromApi?.submitter || null,
      timestamp: mapInfoFromApi?.timestamp || null,
      fileUrl: mapInfoFromApi?.fileUrl || null,
      thumbnailUrl: mapInfoFromApi?.thumbnailUrl || null,
      uploadCheck: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  });

  await db.maps.createMany({ data: newMaps });
  return newMaps;
}

// The Maps row for a map file on a server, created when missing. No permission check: callers
// authorize first. Null when the dedicated server does not know the file.
export async function findOrCreateMapByFileName(
  serverId: string,
  fileName: string,
): Promise<Maps | null> {
  const db = getClient();

  // By uid, not file name: file names are only unique per server, the rows are shared
  const client = getGbxClient(serverId);
  const mapInfo: SMapInfo | null = await client.call("GetMapInfo", fileName);
  if (!mapInfo?.UId) {
    return null;
  }

  const byUid = await db.maps.findFirst({
    where: { uid: mapInfo.UId, deletedAt: null },
  });
  if (byUid) {
    return byUid;
  }

  const [created] = await createMissingMaps(serverId, [
    { UId: mapInfo.UId, FileName: fileName } as MapInfoMinimal,
  ]);
  return created ?? null;
}
