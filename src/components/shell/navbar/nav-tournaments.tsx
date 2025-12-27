"use client";
import { Collapsible } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { generatePath, getCurrentId } from "@/lib/utils";
import { routes } from "@/routes";
import { IconPlus, IconTrophy } from "@tabler/icons-react";
import Link from "next/link";

import Modal from "@/components/modals/modal";
import CreateTournamentModal from "@/components/modals/tournaments/tournament/create-tournament";
import { tables } from "@/lib/tourney-manager";
import { usePathname } from "next/navigation";
import { useSpacetimeDB, useTable } from "spacetimedb/react";

export default function NavTournaments() {
  const pathname = usePathname();
  const activeId = getCurrentId(pathname);

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
              defaultOpen={activeId === tournament.id.toString()}
            >
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={tournament.name} asChild>
                  <Link
                    href={generatePath(routes.tournaments.tournament, {
                      id: tournament.id.toString(),
                    })}
                    className="select-none cursor-pointer"
                  >
                    <IconTrophy />
                    <span className="overflow-hidden text-ellipsis text-nowrap flex items-center">
                      {tournament.name}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Collapsible>
          ))}

          <SidebarMenuItem>
            <Modal>
              <CreateTournamentModal />
              <SidebarMenuButton className="cursor-pointer">
                <IconPlus />
                <span>Create Tournament</span>
              </SidebarMenuButton>
            </Modal>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
