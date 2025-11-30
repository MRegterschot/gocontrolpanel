import { auth, hasPermission } from "@/lib/auth";
import config from "@/lib/config";
import { routePermissions } from "@/routes";
import { Icon } from "@tabler/icons-react";
import NavAdmin from "./nav-admin";
import NavFooter from "./nav-footer";
import NavGroups from "./nav-groups";
import NavTournaments from "./nav-tournaments";

export interface NavItem {
  id?: number;
  name: string;
  url?: string;
  icon: Icon;
  items?: NavItem[];
  isActive?: boolean;
  auth?: boolean;
}

export interface NavGroup {
  name?: string;
  items: NavItem[];
}

export default async function Navbar() {
  const session = await auth();

  const canViewUsers = await hasPermission(routePermissions.admin.users.view);
  const canViewGroups = await hasPermission(routePermissions.admin.groups.view);
  const canViewServers = await hasPermission(
    routePermissions.admin.servers.view,
  );
  const canViewRoles = await hasPermission(routePermissions.admin.roles.view);
  const canViewHetzner = await hasPermission(
    routePermissions.admin.hetzner.view,
  );
  const canViewAuditLogs = await hasPermission(
    routePermissions.admin.auditLogs.view,
  );

  const canViewAdmin =
    canViewUsers ||
    canViewGroups ||
    canViewServers ||
    canViewRoles ||
    canViewHetzner ||
    canViewAuditLogs;

  const usingSpacetime = config.SPACETIME.URI && config.SPACETIME.MODULE;
  
  return (
    <>
      {session && <NavGroups />}
      {session && usingSpacetime && <NavTournaments />}
      {session && canViewAdmin && (
        <NavAdmin
          canViewUsers={canViewUsers}
          canViewGroups={canViewGroups}
          canViewServers={canViewServers}
          canViewRoles={canViewRoles}
          canViewHetzner={canViewHetzner}
          canViewAuditLogs={canViewAuditLogs}
        />
      )}
      <NavFooter />
    </>
  );
}
