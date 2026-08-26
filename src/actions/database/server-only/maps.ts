import { getClient } from "@/lib/dbclient";
import { Maps } from "@/lib/prisma/generated";
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

export async function getMapsByFileNames(
  fileNames: string[],
): Promise<Maps[]> {
  if (fileNames.length === 0) {
    return [];
  }

  const db = getClient();

  return await db.maps.findMany({
    where: { fileName: { in: fileNames }, deletedAt: null },
  });
}
