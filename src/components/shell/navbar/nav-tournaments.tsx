"use client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupAction,
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
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSpacetimeDB, useTable } from "spacetimedb/react";

export default function NavTournaments() {
  const pathname = usePathname();
  const activeId = getCurrentId(pathname);

  const spacetime = useSpacetimeDB();
  const [tournamentRows] = useTable(tables.myTournament);
  const tournaments = [...tournamentRows];

  const upcomingTournaments = tournaments
    .filter((t) => t.endingAt.toDate() >= new Date())
    // Sort by starting date ascending, closest first
    .sort(
      (a, b) =>
        a.startingAt.toDate().getTime() - b.startingAt.toDate().getTime(),
    );
  const passedTournaments = tournaments.filter(
    (t) => t.endingAt.toDate() < new Date(),
  );

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
      <SidebarGroupAction>
        <Modal>
          <CreateTournamentModal />
          <IconPlus /> <span className="sr-only">Create Tournament</span>
        </Modal>
      </SidebarGroupAction>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {upcomingTournaments.map((tournament) => (
            <SidebarMenuItem key={tournament.id}>
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
          ))}

          {passedTournaments.length > 0 && (
            <Collapsible
              asChild
              className="group/collapsible"
              defaultOpen={passedTournaments.some(
                (t) => t.id.toString() === activeId,
              )}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton asChild>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        Passed Tournaments
                      </span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </div>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenu>
                    {passedTournaments.map((tournament) => (
                      <SidebarMenuItem key={tournament.id}>
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
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
