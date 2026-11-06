import { getClient } from "@/lib/dbclient";
import { publishServerEvent } from "@/lib/gbx-service";
import "server-only";

// These servers may render with a group's theme, so they reload it
export async function publishThemeChange(serverIds: string[]): Promise<void> {
  const servers = await getClient().servers.findMany({
    where: { id: { in: [...new Set(serverIds)] }, deletedAt: null },
    select: { id: true },
  });
  await Promise.all(
    servers.map(({ id }) =>
      publishServerEvent({ type: "server.updated", serverId: id }),
    ),
  );
}

export async function groupServerIds(groupId: string): Promise<string[]> {
  const rows = await getClient().groupServers.findMany({
    where: { groupId },
    select: { serverId: true },
  });
  return rows.map((row) => row.serverId);
}
