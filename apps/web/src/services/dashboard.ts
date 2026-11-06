import { getHetznerServers } from "@/actions/hetzner/util";
import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { getErrorMessage } from "@/lib/utils";
import { HetznerServer } from "@/types/api/hetzner/servers";
import { ServerError, ServerResponse } from "@/types/responses";
import { HetznerProjectRole } from "@tmcontrolpanel/db";
import { Session } from "next-auth";
import "server-only";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface DashboardHetznerServer {
  id: number;
  name: string;
  status: HetznerServer["status"];
  type: string;
  location: string;
  ipv4: string | null;
  created: string;
}

export interface DashboardHetznerProject {
  id: string;
  name: string;
  role: HetznerProjectRole;
  servers: DashboardHetznerServer[];
  totalServers: number;
  error?: string;
}

export interface DashboardActivity {
  matches: number;
  records: number;
}

export interface DashboardAdminStats {
  users: number;
  servers: number;
  groups: number;
  hetznerProjects: number;
  plugins: number;
  activeApiKeys: number;
  recentAuditLogs: {
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    error: string | null;
    createdAt: Date;
    user: { login: string; nickName: string } | null;
  }[];
}

// Servers the user can open, directly or through a group; null means all of them
function accessibleServerIds(session: Session): string[] | null {
  if (session.user.admin) return null;
  const ids = new Set(session.user.servers.map((s) => s.id));
  for (const group of session.user.groups) {
    for (const server of group.servers) ids.add(server.id);
  }
  return [...ids];
}

// Only the fields the dashboard shows; labels carry credentials and stay behind
function toDashboardServer(server: HetznerServer): DashboardHetznerServer {
  return {
    id: server.id,
    name: server.name,
    status: server.status,
    type: server.server_type.name,
    location: server.location.city || server.location.name,
    ipv4: server.public_net.ipv4?.ip ?? null,
    created: server.created,
  };
}

// Cloud servers of every Hetzner project the user is a member of
export async function getDashboardHetznerProjects(): Promise<
  ServerResponse<DashboardHetznerProject[]>
> {
  return doServerActionWithAuth([], async (session) => {
    // One failing project (bad token, rate limit) must not hide the others
    return Promise.all(
      session.user.projects.map(async (project) => {
        const base = { id: project.id, name: project.name, role: project.role };
        try {
          const res = await getHetznerServers(project.id);
          return {
            ...base,
            servers: res.servers.map(toDashboardServer),
            totalServers:
              res.meta.pagination.total_entries ?? res.servers.length,
          };
        } catch (error) {
          return {
            ...base,
            servers: [],
            totalServers: 0,
            error: getErrorMessage(error),
          };
        }
      }),
    );
  });
}

// Matches and records of the last week on the servers the user can open
export async function getDashboardActivity(): Promise<
  ServerResponse<DashboardActivity>
> {
  return doServerActionWithAuth([], async (session) => {
    const ids = accessibleServerIds(session);
    if (ids && ids.length === 0) {
      return { matches: 0, records: 0 };
    }

    const db = getClient();
    const since = new Date(Date.now() - WEEK_MS);
    const serverId = ids ? { in: ids } : undefined;

    const [matches, records] = await Promise.all([
      // Same rule as the public stats: a match without records never really happened
      db.matches.count({
        where: {
          deletedAt: null,
          createdAt: { gte: since },
          serverId,
          records: { some: { deletedAt: null } },
        },
      }),
      db.records.count({
        where: {
          deletedAt: null,
          createdAt: { gte: since },
          ...(serverId && { serverId }),
        },
      }),
    ]);

    return { matches, records };
  });
}

export async function getDashboardAdminStats(): Promise<
  ServerResponse<DashboardAdminStats>
> {
  return doServerActionWithAuth([], async (session) => {
    if (!session.user.admin) {
      throw new ServerError("Unauthorized", "Unauthorized");
    }

    const db = getClient();
    const now = new Date();

    const [
      users,
      servers,
      groups,
      hetznerProjects,
      plugins,
      activeApiKeys,
      recentAuditLogs,
    ] = await Promise.all([
      db.users.count({ where: { deletedAt: null } }),
      db.servers.count({ where: { deletedAt: null } }),
      db.groups.count({ where: { deletedAt: null } }),
      db.hetznerProjects.count({ where: { deletedAt: null } }),
      db.plugins.count({ where: { deletedAt: null } }),
      db.apiKeys.count({
        where: {
          deletedAt: null,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      db.auditLogs.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          error: true,
          createdAt: true,
          user: { select: { login: true, nickName: true } },
        },
      }),
    ]);

    return {
      users,
      servers,
      groups,
      hetznerProjects,
      plugins,
      activeApiKeys,
      recentAuditLogs,
    };
  });
}
