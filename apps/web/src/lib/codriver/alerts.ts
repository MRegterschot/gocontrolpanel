import { getClient } from "@/lib/dbclient";
import { getLogger } from "@/lib/logger";
import { getRedisClient } from "@/lib/redis";
import "server-only";
import type { BudgetScope } from "./access";
import type { BudgetState } from "./usage";

const thresholds = [0.8, 1];

// Server budgets go to the server's admins, shared budgets also (or only) to panel admins
async function recipients(
  scope: BudgetScope | "key",
  serverId: string,
  shared: boolean,
) {
  const db = getClient();
  const panelAdmins = shared || scope === "shared-global";
  // The shared key is the operator's to fix; server admins only hear about their own key
  const serverAdmins = scope === "key" ? !shared : scope !== "shared-global";
  const users = await db.users.findMany({
    where: {
      OR: [
        ...(panelAdmins ? [{ admin: true }] : []),
        ...(serverAdmins
          ? [
              { userServers: { some: { serverId, role: "Admin" as const } } },
              {
                groupMembers: {
                  some: {
                    role: "Admin" as const,
                    group: {
                      deletedAt: null,
                      groupServers: { some: { serverId } },
                    },
                  },
                },
              },
            ]
          : []),
      ],
    },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

async function notify(
  userIds: string[],
  serverId: string,
  message: string,
  description: string,
) {
  const db = getClient();
  await db.notifications.createMany({
    data: userIds.map((userId) => ({
      userId,
      serverId,
      type: "codriver",
      message,
      description,
    })),
  });
}

async function serverName(serverId: string): Promise<string> {
  const server = await getClient().servers.findUnique({
    where: { id: serverId },
    select: { name: true },
  });
  return server?.name ?? "a server";
}

// Tells admins when a request pushed a budget past 80% or 100%
export async function notifyBudgetCrossings(
  serverId: string,
  before: BudgetState[],
  addedMicros: number,
): Promise<void> {
  if (addedMicros <= 0) return;
  try {
    for (const state of before) {
      const limit = state.budget.limitCents * 10_000;
      const crossed = thresholds.filter(
        (t) =>
          state.spentMicros < t * limit &&
          state.spentMicros + addedMicros >= t * limit,
      );
      if (crossed.length === 0 || limit === 0) continue;

      const percent = Math.round(Math.max(...crossed) * 100);
      const name = await serverName(serverId);
      const which =
        state.budget.scope === "shared-global"
          ? "the panel's shared key"
          : state.budget.scope === "shared-server"
            ? `the shared key on ${name}`
            : `the API key of ${name}`;
      const message =
        percent >= 100
          ? `Codriver reached its monthly budget for ${which}`
          : `Codriver used ${percent}% of its monthly budget for ${which}`;
      await notify(
        await recipients(
          state.budget.scope,
          serverId,
          state.budget.scope !== "server-key",
        ),
        serverId,
        message,
        percent >= 100
          ? "Requests that need the model stop until next month or until the budget is raised."
          : "Raise the budget in the Codriver settings if this is expected.",
      );
    }
  } catch (error) {
    getLogger(serverId).error({ error }, "Codriver budget notification failed");
  }
}

// At most once an hour per key, so a broken key doesn't flood the notifications
export async function notifyKeyRejected(
  serverId: string,
  keySource: "server" | "shared",
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const scope = keySource === "shared" ? "shared" : serverId;
    if (
      (await redis.set(
        `codriver:key-alert:${scope}`,
        "1",
        "EX",
        3600,
        "NX",
      )) !== "OK"
    )
      return;

    const name = await serverName(serverId);
    await notify(
      await recipients("key", serverId, keySource === "shared"),
      serverId,
      keySource === "shared"
        ? "Codriver's shared API key was rejected"
        : `Codriver's API key for ${name} was rejected`,
      "Players get an error until a working key is stored in the Codriver settings.",
    );
  } catch (error) {
    getLogger(serverId).error({ error }, "Codriver key notification failed");
  }
}
