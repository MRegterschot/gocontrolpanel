import { z } from "zod";

const roleSchema = z.enum(["Admin", "Moderator", "Member"]);

const claimServerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  filemanagerUrl: z.string().nullable().optional(),
});

// Subset of the next-auth JWT the GBX service needs for authorization
export const sessionClaimsSchema = z.object({
  id: z.string(),
  login: z.string().default(""),
  displayName: z.string().default(""),
  admin: z.boolean(),
  permissions: z.array(z.string()).default([]),
  servers: z
    .array(z.object({ id: z.string(), name: z.string(), role: roleSchema }))
    .default([]),
  groups: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().default(""),
        role: roleSchema,
        servers: z.array(claimServerSummarySchema).default([]),
      }),
    )
    .default([]),
  adminGroups: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().default(""),
        servers: z.array(claimServerSummarySchema).default([]),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().default(""),
        role: z.enum(["Admin", "Moderator"]),
      }),
    )
    .default([]),
});

export type SessionClaims = z.infer<typeof sessionClaimsSchema>;
export type ClaimServerSummary = z.infer<typeof claimServerSummarySchema>;

// Permission sets used for per-server actions; ":id" is replaced by the server id
export const serverPermissions = {
  moderator: [
    "servers:id:moderator",
    "servers:id:admin",
    "group:servers:id:moderator",
    "group:servers:id:admin",
  ],
  admin: ["servers:id:admin", "group:servers:id:admin"],
} as const;

// Expands role memberships into permission strings without mutating the claims
export function expandPermissions(claims: SessionClaims): Set<string> {
  const result = new Set(claims.permissions);

  for (const group of claims.groups) {
    const role = group.role.toLowerCase();
    result.add(`groups::${role}`);
    result.add(`groups:${group.id}:${role}`);
    for (const server of group.servers) {
      result.add(`group:servers::${role}`);
      result.add(`group:servers:${server.id}:${role}`);
    }
  }

  for (const project of claims.projects) {
    const role = project.role.toLowerCase();
    result.add(`hetzner::${role}`);
    result.add(`hetzner:${project.id}:${role}`);
  }

  for (const server of claims.servers) {
    const role = server.role.toLowerCase();
    result.add(`servers::${role}`);
    result.add(`servers:${server.id}:${role}`);
  }

  return result;
}

export function hasPermission(
  claims: SessionClaims,
  required?: readonly string[],
  id = "",
): boolean {
  if (claims.admin) return true;
  if (!required || required.length === 0) return true;

  const granted = expandPermissions(claims);
  return required.some((permission) =>
    granted.has(permission.replace(":id", `:${id}`)),
  );
}

// Same rule as the old live/map sockets: admin, direct member, or via a group
export function canViewServer(claims: SessionClaims, serverId: string): boolean {
  return (
    claims.admin ||
    claims.servers.some((server) => server.id === serverId) ||
    claims.groups.some((group) =>
      group.servers.some((server) => server.id === serverId),
    )
  );
}

// Servers shown in the server switcher: group servers plus admin-group servers
export function getAccessibleServers(
  claims: SessionClaims,
): ClaimServerSummary[] {
  const byId = new Map<string, ClaimServerSummary>();
  for (const group of claims.groups) {
    for (const server of group.servers) byId.set(server.id, server);
  }
  for (const group of claims.adminGroups) {
    for (const server of group.servers) byId.set(server.id, server);
  }
  return [...byId.values()];
}

// Servers the user administers directly or through a group Admin role
export function getAdminServerIds(claims: SessionClaims): Set<string> {
  const ids = new Set<string>();
  for (const server of claims.servers) {
    if (server.role === "Admin") ids.add(server.id);
  }
  for (const group of claims.groups) {
    if (group.role !== "Admin") continue;
    for (const server of group.servers) ids.add(server.id);
  }
  return ids;
}
