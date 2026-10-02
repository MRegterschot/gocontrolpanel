import { getMapsInfo } from "@/lib/api/nadeo";
import { getClient } from "@/lib/dbclient";
import { Maps, Prisma } from "@gcp/db";
import "server-only";

const serversPluginsSchema = Prisma.validator<Prisma.ServerPluginsInclude>()({
  plugin: true,
});

export type ServerPluginsWithPlugin = Prisma.ServerPluginsGetPayload<{
  include: typeof serversPluginsSchema;
}>;

const MAP_INFO_UPDATE_THRESHOLD_HOURS = 72;
const BATCH_SIZE = 200;

export async function checkAndUpdateMapsInfoIfNeeded(
  maps: Maps[],
): Promise<Maps[]> {
  const db = getClient();

  const shouldUpdate = (map: Maps): boolean => {
    return (
      !map.thumbnailUrl &&
      (!map.uploadCheck ||
        map.uploadCheck.getTime() <
          Date.now() - MAP_INFO_UPDATE_THRESHOLD_HOURS * 60 * 60 * 1000)
    );
  };

  const mapsNeedingUpdate = maps.filter(shouldUpdate);

  if (mapsNeedingUpdate.length === 0) return maps;

  const updatedMaps: Maps[] = [];

  for (let i = 0; i < mapsNeedingUpdate.length; i += BATCH_SIZE) {
    const batch = mapsNeedingUpdate.slice(i, i + BATCH_SIZE);
    const uids = batch.map((m) => m.uid);
    const { data: apiMapsInfo } = await getMapsInfo(uids);

    for (const map of batch) {
      const apiInfo = apiMapsInfo.find((m) => m.mapUid === map.uid);

      if (!apiInfo) {
        await db.maps.update({
          where: { id: map.id },
          data: {
            uploadCheck: new Date(),
          },
        });
        updatedMaps.push(map);
        continue;
      }

      await db.maps.update({
        where: { id: map.id },
        data: {
          submitter: apiInfo.submitter,
          timestamp: apiInfo.timestamp,
          fileUrl: apiInfo.fileUrl,
          thumbnailUrl: apiInfo.thumbnailUrl,
          uploadCheck: new Date(),
        },
      });

      updatedMaps.push({
        ...map,
        submitter: apiInfo.submitter,
        timestamp: apiInfo.timestamp,
        fileUrl: apiInfo.fileUrl,
        thumbnailUrl: apiInfo.thumbnailUrl,
        uploadCheck: new Date(),
      });
    }
  }

  // Replace updated maps in the original list
  const updatedMapByUid = new Map(updatedMaps.map((m) => [m.uid, m]));

  return maps.map((map) => updatedMapByUid.get(map.uid) ?? map);
}

export async function syncAllMaps(): Promise<Maps[]> {
  const db = getClient();

  const maps = await db.maps.findMany({
    where: {
      deletedAt: null,
    },
  });

  return await checkAndUpdateMapsInfoIfNeeded(maps);
}
