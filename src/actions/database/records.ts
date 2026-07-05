"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { Records } from "@/lib/prisma/generated";
import { ServerResponse } from "@/types/responses";

export interface ServerRecordActivityPoint {
  day: string;
  count: number;
}

export async function getServerRecordActivity(
  serverId: string,
): Promise<ServerResponse<ServerRecordActivityPoint[]>> {
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
      const db = getClient();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      const records = await db.records.findMany({
        where: {
          serverId,
          deletedAt: null,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const countsByDay = new Map<string, number>();
      for (const record of records) {
        const day = record.createdAt.toISOString().split("T")[0];
        countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
      }

      const activity: ServerRecordActivityPoint[] = [];
      for (let index = 6; index >= 0; index -= 1) {
        const date = new Date();
        date.setDate(date.getDate() - index);
        date.setHours(0, 0, 0, 0);

        const day = date.toISOString().split("T")[0];
        activity.push({
          day: date.toLocaleDateString(undefined, { weekday: "short" }),
          count: countsByDay.get(day) ?? 0,
        });
      }

      return activity;
    },
  );
}

export async function exportRecords(
  serverId: string,
  mapUid?: string,
): Promise<ServerResponse<Records[]>> {
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
      const db = getClient();

      const records = await db.records.findMany({
        where: {
          serverId,
          mapUid,
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return records;
    },
  );
}
