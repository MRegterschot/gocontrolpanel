import { getClient } from "@/lib/dbclient";
import { logger } from "@/lib/logger";
import { Notifications } from "@/lib/prisma/generated";
import "server-only";

export async function createNotifications(
  serverId: string,
  type: string,
  message: string,
  description?: string,
): Promise<Notifications[]> {
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

  logger.info(
    `Created ${notifications.length} notifications for server ${serverId} with type ${type} and message ${message}`,
  );

  return notifications;
}
