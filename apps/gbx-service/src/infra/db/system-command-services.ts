import type { DbClient } from "@gcp/db";
import type { Redis } from "ioredis";
import type { SystemCommandServices } from "../../core/chat/system-commands";

export class PrismaSystemCommandServices implements SystemCommandServices {
  constructor(
    private readonly db: DbClient,
    private readonly redis: Pick<Redis, "status" | "ping">,
  ) {}

  async isAdmin(serverId: string, login: string): Promise<boolean> {
    const user = await this.db.users.findFirst({
      where: {
        login,
        OR: [
          { admin: true },
          { userServers: { some: { serverId, role: "Admin" } } },
          {
            groupMembers: {
              some: {
                role: "Admin",
                group: { deletedAt: null, groupServers: { some: { serverId } } },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    return user !== null;
  }

  async checkDatabase(): Promise<void> {
    await this.db.$queryRaw`SELECT 1`;
  }

  async checkRedis(): Promise<void> {
    if (this.redis.status !== "ready") throw new Error("Redis is not ready");
    if ((await this.redis.ping()) !== "PONG")
      throw new Error("Redis ping failed");
  }
}
