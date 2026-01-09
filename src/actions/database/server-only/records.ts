import { getClient } from "@/lib/dbclient";
import "server-only";

export async function getLocalRecord(serverId: string, mapUid: string) {
  const db = getClient();

  // Find all groups that include this server and have shareRecords enabled, return all server ids in these groups
  const groups = await db.groups.findMany({
    where: {
      groupServers: {
        some: {
          serverId,
        },
      },
      shareRecords: true,
    },
    include: {
      groupServers: {
        select: {
          serverId: true,
        },
      },
    },
  });

  const serverIds = groups.flatMap((group) =>
    group.groupServers.map((gs) => gs.serverId),
  );

  // Find the best record for the given map on the given server, if multiple records with equal time exist, return the earliest one
  const record = await db.records.findFirst({
    where: {
      serverId: {
        in: serverIds,
      },
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
  logins: string[],
) {
  const db = getClient();

  // Find all groups that include this server and have shareRecords enabled, return all server ids in these groups
  const groups = await db.groups.findMany({
    where: {
      groupServers: {
        some: {
          serverId,
        },
      },
      shareRecords: true,
    },
    include: {
      groupServers: {
        select: {
          serverId: true,
        },
      },
    },
  });

  const serverIds = groups.flatMap((group) =>
    group.groupServers.map((gs) => gs.serverId),
  );

  const records = await db.records.findMany({
    where: {
      serverId: {
        in: serverIds,
      },
      mapUid,
      login: {
        in: logins,
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
