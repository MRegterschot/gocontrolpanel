"use client";

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
import { useServers } from "@/providers/servers-provider";
import { IconServer } from "@tabler/icons-react";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useMemo } from "react";
import { getServerGroup, ServerNavGroup } from "./nav-groups";

export default function NavAdminGroups() {
  const { data: session } = useSession();

  const { servers, serverId } = useServers();

  const adminGroupsSidebarGroup: ServerNavGroup[] = useMemo(
    () =>
      session?.user.adminGroups.map((group) => ({
        id: group.id,
        name: group.name,
        servers: servers
          .filter((server) => group.servers.some((s) => s.id === server.id))
          .map((server) => getServerGroup(server, session, serverId))
          .filter((server): server is NonNullable<typeof server> => !!server),
      })) || [],
    [session?.user.adminGroups, servers, serverId],
  );

  return adminGroupsSidebarGroup.map((group, index) => (
    <SidebarGroup
      className="group-data-[collapsible=icon]:hidden select-none py-1"
      key={index}
    >
      <Collapsible
        defaultOpen={group.servers.some((server) => server.isActive)}
        className="group/collapsible"
      >
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center gap-2 text-left">
              <span>{group.name}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </button>
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {group.servers.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <IconServer />
                      <span>No servers in this group</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                group.servers.map((server) =>
                  server.items && server.items.length > 0 ? (
                    <Collapsible
                      key={server.id}
                      asChild
                      defaultOpen={server.isActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={server.name} asChild>
                            <div className="select-none cursor-pointer group/item">
                              {server.icon && <server.icon />}
                              <span className="flex items-center overflow-hidden text-ellipsis text-nowrap">
                                {server.name}
                              </span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </div>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {server.items
                              .filter((i) => i.auth || i.auth === undefined)
                              .map((item) => (
                                <SidebarMenuSubItem key={item.name}>
                                  {!(
                                    !server.isConnected && item.needsConnection
                                  ) ? (
                                    <SidebarMenuSubButton asChild>
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
                                    </SidebarMenuSubButton>
                                  ) : (
                                    <SidebarMenuSubButton asChild isDisabled>
                                      <div>
                                        {item.icon && <item.icon />}
                                        <span>{item.name}</span>
                                      </div>
                                    </SidebarMenuSubButton>
                                  )}
                                </SidebarMenuSubItem>
                              ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem key={server.name}>
                      <SidebarMenuButton asChild>
                        <div>
                          {server.icon && <server.icon />}
                          <span>{server.name}</span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ),
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  ));
}
