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
import { useTournaments } from "@/hooks/tournaments/use-tournaments";
import { generatePath } from "@/lib/utils";
import { routes } from "@/routes";
import {
  IconInfoCircle,
  IconTournament,
  IconTrophy,
  IconUsersGroup,
} from "@tabler/icons-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function NavTournaments() {
  const tournaments = useTournaments();

  if (tournaments.length === 0) {
    return null;
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
                          href={generatePath(routes.tournaments.bracket, {
                            id: tournament.id.toString(),
                          })}
                        >
                          <IconTournament />
                          <span>Bracket</span>
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
