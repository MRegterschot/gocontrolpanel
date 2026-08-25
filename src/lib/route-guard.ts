import { routePermissions } from "@/routes";
import { PermissionCheck } from "./permissions";

/**
 * Route-level authorization, resolved from a pathname alone.
 *
 * This covers the admin area only, and each entry mirrors *exactly* the check the
 * corresponding page already performs. That is deliberate: the proxy is defence
 * in depth in front of the page checks, never a replacement for them and never
 * stricter than them, so a mismatch can only ever be an unnecessary redirect —
 * not a lockout of someone the page would have admitted.
 *
 * The rest of the app is not gated here. Server routes carry per-feature
 * permissions (`game.mapActions`, `game.scriptSettings`, …) that describe UI
 * elements rather than whole pages, and collapsing them into a single route rule
 * would deny people access to pages they can legitimately use.
 */
type Guard = {
  /** Matches the start of the pathname. Longest match wins. */
  prefix: string;
  permissions: readonly PermissionCheck[];
  /**
   * Whether the permissions use the `:id` placeholder, which is filled from the
   * path segment following the prefix.
   */
  scoped?: boolean;
};

const GUARDS: readonly Guard[] = [
  { prefix: "/admin/users", permissions: routePermissions.admin.users.view },
  { prefix: "/admin/groups", permissions: routePermissions.admin.groups.view },
  { prefix: "/admin/roles", permissions: routePermissions.admin.roles.view },
  {
    prefix: "/admin/servers",
    permissions: routePermissions.admin.servers.view,
  },
  {
    prefix: "/admin/audit-logs",
    permissions: routePermissions.admin.auditLogs.view,
  },
  // Longest-prefix ordering matters: /admin/hetzner/<id> is a project page and
  // uses a different, id-scoped permission than the /admin/hetzner index.
  {
    prefix: "/admin/hetzner/",
    permissions: routePermissions.admin.hetzner.servers.view,
    scoped: true,
  },
  {
    prefix: "/admin/hetzner",
    permissions: routePermissions.admin.hetzner.view,
  },
];

export type RouteGuard = {
  permissions: readonly PermissionCheck[];
  /** Entity id for `:id` substitution, empty when the rule is not scoped. */
  id: string;
};

/**
 * The permissions required to open `pathname`, or `null` when the route has no
 * route-level rule (it may still enforce its own).
 */
export function routeGuardFor(pathname: string): RouteGuard | null {
  const guard = [...GUARDS]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((g) => pathname === g.prefix || pathname.startsWith(g.prefix));

  if (!guard) return null;

  let id = "";
  if (guard.scoped) {
    id = pathname.slice(guard.prefix.length).split("/")[0] ?? "";
    // `/admin/hetzner/` with nothing after it is the index, not a project.
    if (!id) return null;
  }

  return { permissions: guard.permissions, id };
}
