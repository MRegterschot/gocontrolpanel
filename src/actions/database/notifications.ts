"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { Notifications } from "@/lib/prisma/generated";
import { ServerResponse } from "@/types/responses";

export async function getNotifications(): Promise<
  ServerResponse<Notifications[]>
> {
  return doServerActionWithAuth([], async (session) => {
    const userId = session.user.id;

    const db = getClient();

    return db.notifications.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<ServerResponse<Notifications>> {
  return doServerActionWithAuth([], async (session) => {
    const userId = session.user.id;

    const db = getClient();

    return await db.notifications.update({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
      },
    });
  });
}
