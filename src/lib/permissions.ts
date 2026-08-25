import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";

/**
 * The single source of truth for permission strings.
 *
 * There are two kinds of permission in this application:
 *
 * 1. **Grantable permissions** — stored on a user or a role and listed in
 *    `PERMISSIONS` below. These are what the role editor offers.
 * 2. **Role-derived permissions** — synthesised at check time by
 *    `resolvePermissions` below from the user's group, project and server
 *    memberships (`servers::admin`, `hetzner:<projectId>:admin`, …). They are
 *    never stored, so they must never appear in `PERMISSIONS`.
 *
 * Both kinds are accepted wherever a permission is checked, which is what
 * `PermissionCheck` describes. Typing the check sites against it is the point of
 * this module: before it existed, `updateHetznerServer` required
 * "hetzner:servers:update", which is not a grantable permission and not a role
 * form, so no grant could ever satisfy it.
 */

/** Every permission that can be granted to a user or a role. */
export const PERMISSIONS = [
  "users:view",
  "users:edit",
  "users:delete",
  "groups:view",
  "groups:create",
  "groups:edit",
  "groups:delete",
  "roles:view",
  "roles:create",
  "roles:edit",
  "roles:delete",
  "servers:view",
  "servers:create",
  "servers:edit",
  "servers:delete",
  "servers:clients:view",
  "servers:clients:manage",
  "hetzner:view",
  "hetzner:create",
  "hetzner:edit",
  "hetzner:delete",
  "hetzner:servers:view",
  "hetzner:servers:create",
  "hetzner:servers:manage",
  "hetzner:servers:delete",
  "audit-logs:view",
  "audit-logs:delete",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Roles a membership can carry, lowercased as they appear in permission strings. */
export type RoleName = "member" | "moderator" | "admin";

/**
 * The membership kinds that produce role-derived permissions. Keep in step with
 * `resolvePermissions` below.
 */
export type RoleScope = "servers" | "groups" | "group:servers" | "hetzner";

/**
 * A role-derived permission: either the bare form (the user holds this role on
 * *some* entity) or the scoped form (on a specific one).
 *
 * The scoped form also covers the `:id` placeholder used by `routePermissions`,
 * which `hasPermission` substitutes with the concrete id at check time.
 */
export type RolePermission =
  | `${RoleScope}::${RoleName}`
  | `${RoleScope}:${string}:${RoleName}`;

/** Anything accepted by `hasPermission`, `withAuth` and `doServerActionWithAuth`. */
export type PermissionCheck = Permission | RolePermission;

/** The placeholder `hasPermission` replaces with the id it is given. */
export const ID_PLACEHOLDER = "id";

/** `servers::admin` — holds if the user has that role on any entity in scope. */
export function anyRole<S extends RoleScope, R extends RoleName>(
  scope: S,
  role: R,
): `${S}::${R}` {
  return `${scope}::${role}`;
}

/** `servers:<id>:admin` — holds only for that specific entity. */
export function roleOn<S extends RoleScope, R extends RoleName>(
  scope: S,
  id: string,
  role: R,
): `${S}:${string}:${R}` {
  return `${scope}:${id}:${role}`;
}

/**
 * `servers:id:admin` — the placeholder form for `routePermissions`, resolved
 * against the concrete id passed to `hasPermission`.
 */
export function roleOnCurrent<S extends RoleScope, R extends RoleName>(
  scope: S,
  role: R,
): `${S}:${string}:${R}` {
  return roleOn(scope, ID_PLACEHOLDER, role);
}

export function hasPermissionSync(
  session: Session | null,
  permissions?: readonly PermissionCheck[],
  id = "",
): boolean {
  if (!session) return false;

  return hasPermissionsJWTSync(session.user, permissions, id);
}

/**
 * Expands a JWT into the full set of permission strings it grants: the
 * explicitly granted ones plus the ones derived from group, project and server
 * role membership.
 *
 * Pure by construction — it never touches the JWT it is handed. An earlier
 * version pushed the derived entries straight into `jwt.permissions`, which
 * mutated the caller's session object and made the array grow on every check.
 */
export function resolvePermissions(jwt: JWT): Set<string> {
  // auth.ts already normalises this through getList when minting the token; the
  // guard is only here so a malformed token cannot throw inside a permission
  // check. Deliberately not importing from ./utils -- this module is on the
  // proxy's import graph, which runs on the edge runtime.
  const resolved = new Set<string>(
    Array.isArray(jwt.permissions) ? jwt.permissions : [],
  );

  for (const group of jwt.groups ?? []) {
    const role = group.role.toLowerCase();
    resolved.add(`groups::${role}`);
    resolved.add(`groups:${group.id}:${role}`);
    for (const server of group.servers ?? []) {
      resolved.add(`group:servers::${role}`);
      resolved.add(`group:servers:${server.id}:${role}`);
    }
  }

  for (const project of jwt.projects ?? []) {
    const role = project.role.toLowerCase();
    resolved.add(`hetzner::${role}`);
    resolved.add(`hetzner:${project.id}:${role}`);
  }

  for (const server of jwt.servers ?? []) {
    const role = server.role.toLowerCase();
    resolved.add(`servers::${role}`);
    resolved.add(`servers:${server.id}:${role}`);
  }

  return resolved;
}

export function hasPermissionsJWTSync(
  jwt: JWT,
  permissions?: readonly PermissionCheck[],
  id = "",
): boolean {
  if (jwt.admin) return true;
  if (!permissions || permissions.length === 0) return true;

  const resolved = resolvePermissions(jwt);

  return permissions.some((permission) =>
    resolved.has(permission.replace(":id", `:${id}`)),
  );
}
