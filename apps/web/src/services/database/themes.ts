import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { ServerError, ServerResponse } from "@/types/responses";
import { DEFAULT_THEME, type ManialinkTheme, parseTheme } from "@gcp/shared";
import "server-only";

export interface ServerThemeOverview {
  // The server's own theme; null when it uses the inherited one
  theme: ManialinkTheme | null;
  // What the server shows without its own theme
  inherited: ManialinkTheme;
  // Group the inherited theme comes from; null for the default
  inheritedFrom: string | null;
}

export async function getServerTheme(
  serverId: string,
): Promise<ServerResponse<ServerThemeOverview>> {
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const server = await getClient().servers.findFirst({
        where: { id: serverId, deletedAt: null },
        select: {
          theme: true,
          groupServers: {
            where: { group: { deletedAt: null } },
            select: {
              group: { select: { name: true, theme: true, createdAt: true } },
            },
          },
        },
      });
      if (!server) throw new ServerError("Server not found", "NotFound");

      // Same order as the GBX service: the oldest group with a theme wins
      const group = server.groupServers
        .map((gs) => gs.group)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((g) => ({ name: g.name, theme: parseTheme(g.theme) }))
        .find((g) => g.theme);

      return {
        theme: parseTheme(server.theme),
        inherited: group?.theme ?? DEFAULT_THEME,
        inheritedFrom: group?.name ?? null,
      };
    },
  );
}
