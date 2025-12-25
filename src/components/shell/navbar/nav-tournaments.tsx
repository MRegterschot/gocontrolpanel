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
import { generatePath } from "@/lib/utils";
import { routes } from "@/routes";
import {
  IconInfoCircle,
  IconTrophy,
  IconUsersGroup,
} from "@tabler/icons-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { tables } from "@/lib/tourney-manager";
import { useSpacetimeDB, useTable } from "spacetimedb/react";

export default function NavTournaments() {
  const spacetime = useSpacetimeDB();
  const [tournaments] = useTable(tables.tournament);

  if (!spacetime.isActive) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden select-none">
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Not connected to SpacetimeDB</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden select-none">
      <SidebarGroupLabel>Tournaments</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {tournaments.map((tournament) => (
            <Collapsible
              key={tournament.id}
              asChild
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={tournament.name} asChild>
                    <div className="select-none cursor-pointer">
                      <IconTrophy />
                      <span className="overflow-hidden text-ellipsis text-nowrap flex items-center">
                        {tournament.name}
                      </span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </div>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link
                          href={generatePath(routes.tournaments.tournament, {
                            id: tournament.id.toString(),
                          })}
                        >
                          <IconInfoCircle />
                          <span>Tournament Info</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link
                          href={generatePath(routes.tournaments.registration, {
                            id: tournament.id.toString(),
                          })}
                        >
                          <IconUsersGroup />
                          <span>Registrations</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
