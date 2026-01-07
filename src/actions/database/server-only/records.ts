import { getClient } from "@/lib/dbclient";
import "server-only";

export async function getLocalRecord(serverId: string, mapUid: string) {
  const db = getClient();

  // Find the best record for the given map on the given server, if multiple records with equal time exist, return the earliest one
  const record = await db.records.findFirst({
    where: {
      serverId,
      mapUid,
      deletedAt: null,
      time: {
        gt: 0,
      },
    },
    orderBy: [{ time: "asc" }, { createdAt: "asc" }],
    include: {
      user: {
        select: {
          nickName: true,
        },
      },
    },
  });

  return record;
}

export async function getPlayerRecords(
  serverId: string,
  mapUid: string,
  login: string[],
) {
  const db = getClient();

  const records = await db.records.findMany({
    where: {
      serverId,
      mapUid,
      login: {
        in: login,
      },
      deletedAt: null,
      time: {
        gt: 0,
      },
    },
    orderBy: {
      time: "asc",
    },
    distinct: ["login"],
    include: {
      user: {
        select: {
          nickName: true,
        },
      },
    },
  });

  return records;
}
