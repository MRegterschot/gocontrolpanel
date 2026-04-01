"use client";
import { updateGroupOrder } from "@/actions/database/groups";
import IconNadeo from "@/components/icons/nadeo";
import IconTmx from "@/components/icons/tmx-svg";
import { Button } from "@/components/ui/button";
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
import { generatePath, getErrorMessage, hasPermissionSync } from "@/lib/utils";
import { useNotifications } from "@/providers/notification-provider";
import { useServers } from "@/providers/servers-provider";
import { connectionRoutes, routePermissions, routes } from "@/routes";
import { UserGroup } from "@/types/auth";
import {
  IconActivity,
  IconAdjustmentsAlt,
  IconChevronDown,
  IconChevronUp,
  IconDeviceDesktop,
  IconDeviceGamepad,
  IconFileDescription,
  IconMap,
  IconServer,
  IconServerOff,
  IconStopwatch,
  IconUsers,
} from "@tabler/icons-react";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ServerNavGroup {
  id: string;
  name: string;
  servers: {
    id: string;
    name: string;
    isConnected: boolean;
    isActive: boolean;
    icon?: React.ElementType;
    items?: {
      name: string;
      url: string;
      icon?: React.ElementType;
      auth?: boolean;
      needsConnection?: boolean;
    }[];
  }[];
}

export default function NavGroups() {
  const { data: session } = useSession();
  const { notifications } = useNotifications();

  const { servers, serverId, loading } = useServers();

  const [groups, setGroups] = useState<UserGroup[]>([]);

  useEffect(() => {
    const sortedGroups =
      session?.user.groups
        .sort((a, b) => a.order - b.order)
        .map((g, i) => ({
          ...g,
          order: i,
        })) || [];
    setGroups(sortedGroups);
    updateGroupOrderAction(sortedGroups);
  }, [session?.user.groups]);

  const groupsSidebarGroup: ServerNavGroup[] = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name,
        servers: servers
          .filter((server) => group.servers.some((s) => s.id === server.id))
          .sort((a, b) => {
            // If no serversOrder, sort by name
            if (!group.serversOrder) {
              return a.name.localeCompare(b.name);
            }

            // Sort servers based on serversOrder in the group, if not found (-1), sort by name
            const indexA = group.serversOrder.findIndex((s) => s === a.id);
            const indexB = group.serversOrder.findIndex((s) => s === b.id);

            if (indexA === -1 && indexB === -1) {
              return a.name.localeCompare(b.name);
            }
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;

            return indexA - indexB;
          })
          .map((server) => {
            const serverGroup = {
              id: server.id,
              name: server.name,
              isConnected: server.isConnected,
              icon: server.isConnected ? IconServer : IconServerOff,
              isActive: serverId === server.id,
              items: [
                {
                  name: "Settings",
                  url: generatePath(routes.servers.settings, {
                    id: server.id,
                  }),
                  icon: IconAdjustmentsAlt,
                  auth: hasPermissionSync(
                    session,
                    routePermissions.servers.settings,
                    server.id,
                  ),
                  needsConnection: connectionRoutes.includes(
                    routes.servers.settings,
                  ),
                },
                {
                  name: "Game",
                  url: generatePath(routes.servers.game, {
                    id: server.id,
                  }),
                  icon: IconDeviceGamepad,
                  needsConnection: connectionRoutes.includes(
                    routes.servers.game,
                  ),
                },
                {
                  name: "Maps",
                  url: generatePath(routes.servers.maps, {
                    id: server.id,
                  }),
                  icon: IconMap,
                  auth: hasPermissionSync(
                    session,
                    routePermissions.servers.maps,
                    server.id,
                  ),
                  needsConnection: connectionRoutes.includes(
                    routes.servers.maps,
                  ),
                },
                {
                  name: "Players",
                  url: generatePath(routes.servers.players, {
                    id: server.id,
                  }),
                  icon: IconUsers,
                  auth: hasPermissionSync(
                    session,
                    routePermissions.servers.players,
                    server.id,
                  ),
                  needsConnection: connectionRoutes.includes(
                    routes.servers.players,
                  ),
                },
                {
                  name: "Live",
                  url: generatePath(routes.servers.live, {
                    id: server.id,
                  }),
                  icon: IconActivity,
                  needsConnection: connectionRoutes.includes(
                    routes.servers.live,
                  ),
                },
                {
                  name: "Records",
                  url: generatePath(routes.servers.records, {
                    id: server.id,
                  }),
                  icon: IconStopwatch,
                  needsConnection: connectionRoutes.includes(
                    routes.servers.records,
                  ),
                },
                {
                  name: "Interface",
                  url: generatePath(routes.servers.interface, {
                    id: server.id,
                  }),
                  icon: IconDeviceDesktop,
                  auth: hasPermissionSync(
                    session,
                    routePermissions.servers.interface,
                    server.id,
                  ),
                  needsConnection: connectionRoutes.includes(
                    routes.servers.interface,
                  ),
                },
                {
                  name: "TMX",
                  url: generatePath(routes.servers.tmx, {
                    id: server.id,
                  }),
                  icon: IconTmx,
                  auth: hasPermissionSync(
                    session,
                    routePermissions.servers.tmx,
                    server.id,
                  ),
                  needsConnection: connectionRoutes.includes(
                    routes.servers.tmx,
                  ),
                },
                {
                  name: "Nadeo",
                  url: generatePath(routes.servers.nadeo, {
                    id: server.id,
                  }),
                  icon: IconNadeo,
                  auth: hasPermissionSync(
                    session,
                    routePermissions.servers.nadeo,
                    server.id,
                  ),
                  needsConnection: connectionRoutes.includes(
                    routes.servers.nadeo,
                  ),
                },
              ],
            };

            if (server.filemanagerUrl) {
              serverGroup.items.push({
                name: "Files",
                url: generatePath(routes.servers.files, {
                  id: server.id,
                }),
                icon: IconFileDescription,
                auth: hasPermissionSync(
                  session,
                  routePermissions.servers.files,
                  server.id,
                ),
                needsConnection: connectionRoutes.includes(
                  routes.servers.files,
                ),
              });
            }

            return serverGroup;
          })
          .filter((server): server is NonNullable<typeof server> => !!server),
      })) || [],
    [groups, servers, serverId],
  );

  const updateGroupOrderAction = async (updatedGroups: UserGroup[]) => {
    try {
      const { error } = await updateGroupOrder(updatedGroups.map((g) => g.id));
      if (error) {
        throw new Error(error);
      }
    } catch (error) {
      toast.error("Failed to update group order", {
        description: getErrorMessage(error),
      });
    }
  };

  const moveGroup = (id: string, direction: "up" | "down") => {
    const sorted = [...groups];
    const index = sorted.findIndex((g) => g.id === id);

    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    [sorted[index], sorted[targetIndex]] = [sorted[targetIndex], sorted[index]];

    const normalized = sorted.map((g, i) => ({
      ...g,
      order: i,
    }));

    setGroups(normalized);
    updateGroupOrderAction(normalized);
  };

  if (loading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden select-none">
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconServer />
                  <span>Loading...</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (groupsSidebarGroup.length === 0) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden select-none">
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>No groups found</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return groupsSidebarGroup.map((group, index) => (
    <SidebarGroup
      className="group-data-[collapsible=icon]:hidden select-none"
      key={index}
    >
      <SidebarGroupLabel className="flex items-center justify-between">
        <span>{group.name}</span>
        <div className="flex items-center gap-1">
          <Button
            size="sidebar"
            variant="ghost"
            onClick={() => moveGroup(group.id, "up")}
          >
            <IconChevronUp className="w-4 h-4" />
          </Button>
          <Button
            size="sidebar"
            variant="ghost"
            onClick={() => moveGroup(group.id, "down")}
          >
            <IconChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </SidebarGroupLabel>
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
                        <div className="select-none cursor-pointer">
                          {server.icon && <server.icon />}
                          <span className="overflow-hidden text-ellipsis text-nowrap flex items-center">
                            {server.name}
                            {notifications.some(
                              (n) => n.serverId === server.id && !n.read,
                            ) && (
                              <span className="ml-2 h-3 w-3 text-center rounded-full bg-destructive text-[8px]">
                                {
                                  notifications.filter(
                                    (n) => n.serverId === server.id && !n.read,
                                  ).length
                                }
                              </span>
                            )}
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
    </SidebarGroup>
  ));
}
