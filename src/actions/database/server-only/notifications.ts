import { getClient } from "@/lib/dbclient";
import { getLogger } from "@/lib/logger";
import { Notifications } from "@/lib/prisma/generated";
import "server-only";

export async function createNotifications(
  serverId: string,
  type: string,
  message: string,
  description?: string,
): Promise<Notifications[]> {
  const meta = {
    type: "database",
    module: "notifications",
    function: "createNotifications",
  };
  const log = getLogger(serverId);
  const db = getClient();

  const users = await db.users.findMany({
    where: {
      OR: [
        {
          userServers: {
            some: {
              serverId,
              role: "Admin",
            },
          },
        },
        {
          groupMembers: {
            some: {
              group: {
                groupServers: {
                  some: { serverId },
                },
              },
              role: "Admin",
            },
          },
        },
      ],
    },
    distinct: ["id"],
  });

  const notifications = await Promise.all(
    users.map((user) =>
      db.notifications.create({
        data: {
          userId: user.id,
          serverId,
          type,
          message,
          description,
        },
      }),
    ),
  );

  log.debug(
    { meta, notifications: notifications.length, type, message },
    "Created notifications",
  );

  return notifications;
}
