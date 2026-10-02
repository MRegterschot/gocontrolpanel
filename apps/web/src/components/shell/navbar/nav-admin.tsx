import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { routes } from "@/routes";
import {
  IconClipboardText,
  IconCloud,
  IconLogs,
  IconServerCog,
  IconUserCog,
  IconUsersGroup,
} from "@tabler/icons-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { NavGroup } from ".";

export default async function NavAdmin({
  canViewUsers,
  canViewGroups,
  canViewServers,
  canViewRoles,
  canViewHetzner,
  canViewAuditLogs,
}: {
  canViewUsers: boolean;
  canViewGroups: boolean;
  canViewServers: boolean;
  canViewRoles: boolean;
  canViewHetzner: boolean;
  canViewAuditLogs: boolean;
}) {
  const group: NavGroup = {
    name: "Admin",
    items: [
      {
        name: "Users",
        url: routes.admin.users,
        icon: IconUserCog,
        auth: canViewUsers,
      },
      {
        name: "Groups",
        url: routes.admin.groups,
        icon: IconUsersGroup,
        auth: canViewGroups,
      },
      {
        name: "Roles",
        url: routes.admin.roles,
        icon: IconClipboardText,
        auth: canViewRoles,
      },
      {
        name: "Servers",
        url: routes.admin.servers,
        icon: IconServerCog,
        auth: canViewServers,
      },
      {
        name: "Hetzner",
        url: routes.admin.hetzner,
        icon: IconCloud,
        auth: canViewHetzner,
      },
      {
        name: "Audit Logs",
        url: routes.admin.auditLogs,
        icon: IconLogs,
        auth: canViewAuditLogs,
      },
    ],
  };

  return (
    <SidebarGroup
      className="group-data-[collapsible=icon]:hidden select-none"
      key={group.name || "default"}
    >
      {group.name && <SidebarGroupLabel>{group.name}</SidebarGroupLabel>}
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {group.items
            .filter((i) => i.auth)
            .map((item) =>
              item.items && item.items.length > 0 ? (
                <Collapsible
                  key={item.id || item.name}
                  asChild
                  defaultOpen={item.isActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.name} asChild>
                        {item.url ? (
                          <Link href={item.url}>
                            {item.icon && <item.icon />}
                            <span className="overflow-hidden text-ellipsis text-nowrap">
                              {item.name}
                            </span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </Link>
                        ) : (
                          <div>
                            {item.icon && <item.icon />}
                            <span className="overflow-hidden text-ellipsis text-nowrap">
                              {item.name}
                            </span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </div>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.name}>
                            <SidebarMenuSubButton asChild>
                              {subItem.url ? (
                                <Link href={subItem.url}>
                                  {subItem.icon && <subItem.icon />}
                                  <span>{subItem.name}</span>
                                </Link>
                              ) : (
                                <div>
                                  {subItem.icon && <subItem.icon />}
                                  <span>{subItem.name}</span>
                                </div>
                              )}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    {item.url ? (
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.name}</span>
                      </Link>
                    ) : (
                      <div>
                        {item.icon && <item.icon />}
                        <span>{item.name}</span>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ),
            )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
