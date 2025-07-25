"use server";
import { doServerActionWithAuth } from "@/lib/actions";
import { getMapsInfo } from "@/lib/api/nadeo";
import { getClient } from "@/lib/dbclient";
import { getGbxClient } from "@/lib/gbxclient";
import { Maps } from "@/lib/prisma/generated";
import { SMapInfo } from "@/types/gbx/map";
import { MapInfoMinimal } from "@/types/map";
import { ServerError, ServerResponse } from "@/types/responses";
import { checkAndUpdateMapsInfoIfNeeded } from "./gbx";

export async function getMapByUid(
  uid: string,
): Promise<ServerResponse<Maps | null>> {
  return doServerActionWithAuth(
    [
      "servers::member",
      "servers::moderator",
      "servers::admin",
      "group:servers::member",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      const db = getClient();
      const map = await db.maps.findFirst({
        where: { uid, deletedAt: null },
      });

      if (!map) {
        return null;
      }

      const [updatedMap] = await checkAndUpdateMapsInfoIfNeeded([map]);

      return updatedMap;
    },
  );
}

export async function getMapList(
  serverId: string,
  count?: number,
  start: number = 0,
): Promise<ServerResponse<Maps[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:member`,
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:member`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = await getGbxClient(serverId);
      const pageSize = 100;
      let allMapList: MapInfoMinimal[] = [];

      if (count === undefined) {
        let currentStart = start;
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
      } else {
        allMapList = await client.call("GetMapList", count, start);
      }

      if (!allMapList || allMapList.length === 0) {
        throw new ServerError("Failed to get map list");
      }

      const uids = allMapList.filter((map) => map?.UId).map((map) => map.UId);

      const db = getClient();

      const existingMaps = await db.maps.findMany({
        where: {
          uid: { in: uids },
          deletedAt: null,
        },
      });

      const existingUids = new Set(existingMaps.map((m) => m.uid));

      const missingMaps = allMapList.filter(
        (map) => !existingUids.has(map.UId),
      );

      if (missingMaps.length > 0) {
        const mapUids = missingMaps.map((map) => map.UId);
        const BATCH_SIZE = 200;

        const now = new Date();
        const newMaps: Maps[] = [];

        for (let i = 0; i < mapUids.length; i += BATCH_SIZE) {
          const batch = mapUids.slice(i, i + BATCH_SIZE);
          const { data: apiMapsInfo } = await getMapsInfo(batch);

          for (const map of missingMaps) {
            try {
              const mapInfo: SMapInfo = await client.call(
                "GetMapInfo",
                map.FileName,
              );
              const mapInfoFromApi = apiMapsInfo?.find(
                (m) => m.mapUid === map.UId,
              );

              if (newMaps.some((m) => m.uid === mapInfo.UId)) {
                console.warn(`Duplicate map UID found: ${mapInfo.UId}`);
                continue;
              }

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
                uploadCheck: new Date(),
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
              });
            } catch (err) {
              console.warn(`Skipping map "${map.FileName}" due to error:`, err);
              continue;
            }
          }
        }

        await db.maps.createMany({ data: newMaps });
        existingMaps.push(...newMaps);
      }

      const orderedMaps = allMapList
        .map((map) => {
          const foundMap = existingMaps.find((m) => m.uid === map.UId);
          return foundMap ? foundMap : null;
        })
        .filter((map: Maps | null): map is Maps => map !== null);

      return orderedMaps;
    },
  );
}
