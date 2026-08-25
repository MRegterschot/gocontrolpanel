/**
 * The single source of truth for permission strings.
 *
 * There are two kinds of permission in this application:
 *
 * 1. **Grantable permissions** — stored on a user or a role and listed in
 *    `PERMISSIONS` below. These are what the role editor offers.
 * 2. **Role-derived permissions** — synthesised at check time by
 *    `resolvePermissions` in `./utils` from the user's group, project and server
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
 * `resolvePermissions` in `./utils`.
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
