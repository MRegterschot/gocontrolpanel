"use server";
import { doServerActionWithAuth } from "@/lib/actions";
import { getAccountNames, getMapsInfo } from "@/lib/api/nadeo";
import { getClient } from "@/lib/dbclient";
import { getGbxClient } from "@/lib/managers/gbxclient-manager";
import { Maps, Prisma } from "@/lib/prisma/generated";
import { SMapInfo } from "@/types/gbx/map";
import { MapInfoMinimal } from "@/types/map";
import {
  PaginationResponse,
  ServerError,
  ServerResponse,
} from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { checkAndUpdateMapsInfoIfNeeded } from "./server-only/gbx";

const mapsRecordsSchema = (serverId?: string) =>
  Prisma.validator<Prisma.MapsInclude>()({
    records: {
      where: {
        serverId,
      },
      distinct: ["login"],
      orderBy: [{ time: "asc" }, { createdAt: "asc" }],
      include: {
        user: {
          select: {
            nickName: true,
          },
        },
      },
    },
  });

export type MapsWithRecords = Prisma.MapsGetPayload<{
  include: ReturnType<typeof mapsRecordsSchema>;
}>;

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
): Promise<ServerResponse<(Maps & { path: string })[]>> {
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
                uploadCheck: now,
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
          return foundMap
            ? {
                ...foundMap,
                path: map.FileName,
              }
            : null;
        })
        .filter((map) => map !== null);

      return orderedMaps;
    },
  );
}

export async function getMapRecordsPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter: string,
  fetchArgs?: {
    serverId: string;
  },
): Promise<ServerResponse<PaginationResponse<MapsWithRecords>>> {
  if (!fetchArgs?.serverId) {
    throw new ServerError("Server ID is required to fetch maps records.");
  }

  return doServerActionWithAuth(
    [
      `servers:${fetchArgs.serverId}:member`,
      `servers:${fetchArgs.serverId}:moderator`,
      `servers:${fetchArgs.serverId}:admin`,
      `group:servers:${fetchArgs.serverId}:member`,
      `group:servers:${fetchArgs.serverId}:moderator`,
      `group:servers:${fetchArgs.serverId}:admin`,
    ],
    async () => {
      const db = getClient();

      const { data: serverMaps, error } = await getMapList(fetchArgs.serverId);
      if (error) {
        throw new ServerError(error);
      }

      const maps = await db.maps.findMany({
        skip: pagination.pageIndex * pagination.pageSize,
        take: pagination.pageSize,
        orderBy: { [sorting.field]: sorting.order },
        where: {
          id: { in: serverMaps.map((m) => m.id) },
          deletedAt: null,
          OR: [
            { name: { contains: filter } },
            {
              authorNickname: { contains: filter },
            },
          ],
        },
        include: mapsRecordsSchema(fetchArgs.serverId),
      });

      const totalCount = await db.maps.count({
        where: {
          id: { in: serverMaps.map((m) => m.id) },
          deletedAt: null,
          OR: [
            { name: { contains: filter } },
            {
              authorNickname: { contains: filter },
            },
          ],
        },
      });

      return {
        data: maps,
        totalCount,
      };
    },
  );
}

export async function getMapsByUids(
  uids: string[],
): Promise<ServerResponse<Maps[]>> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      const db = getClient();

      const existingMaps = await db.maps.findMany({
        where: {
          uid: { in: uids },
        },
      });

      const existingUids = new Set(existingMaps.map((m) => m.uid));
      const missingUids = uids.filter((uid) => !existingUids.has(uid));

      if (missingUids.length > 0) {
        const BATCH_SIZE = 200;

        const now = new Date();
        const newMaps: Maps[] = [];

        for (let i = 0; i < missingUids.length; i += BATCH_SIZE) {
          const batch = missingUids.slice(i, i + BATCH_SIZE);
          const { data: apiMapsInfo, error } = await getMapsInfo(batch);
          if (error) {
            console.warn("Failed to fetch map info from Nadeo API:", error);
            continue;
          }

          const authorAccountIds = [
            ...new Set(apiMapsInfo.map((m) => m.author)),
          ];
          const accountNames = await getAccountNames(authorAccountIds);

          for (const mapInfo of apiMapsInfo) {
            if (newMaps.some((m) => m.uid === mapInfo.mapUid)) {
              console.warn(`Duplicate map UID found: ${mapInfo.mapUid}`);
              continue;
            }

            newMaps.push({
              id: crypto.randomUUID(),
              name: mapInfo.name || "Unknown",
              uid: mapInfo.mapUid,
              fileName: mapInfo.filename || "",
              author: mapInfo.author || "",
              authorNickname: accountNames[mapInfo.author] || "",
              authorTime: mapInfo.authorScore || 0,
              goldTime: mapInfo.goldScore || 0,
              silverTime: mapInfo.silverScore || 0,
              bronzeTime: mapInfo.bronzeScore || 0,
              submitter: mapInfo.submitter || null,
              timestamp: mapInfo.timestamp || null,
              fileUrl: mapInfo.fileUrl || null,
              thumbnailUrl: mapInfo.thumbnailUrl || null,
              uploadCheck: now,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            });
          }
        }

        await db.maps.createMany({ data: newMaps });
        existingMaps.push(...newMaps);
      }

      const orderedMaps = uids
        .map((uid) => {
          const foundMap = existingMaps.find((m) => m.uid === uid);
          return foundMap ? foundMap : null;
        })
        .filter((map: Maps | null): map is Maps => map !== null);

      return orderedMaps;
    },
  );
}
