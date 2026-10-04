"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { Notifications } from "@gcp/db";
import { ServerResponse } from "@/types/responses";

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
