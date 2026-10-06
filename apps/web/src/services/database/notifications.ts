import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { ServerResponse } from "@/types/responses";
import { Notifications } from "@gcp/db";
import "server-only";

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
