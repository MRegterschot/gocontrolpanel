"use client";

import { Team } from "@/types/live";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import SetTeamMapPointsModal from "../modals/live/teams/set-team-map-points-modal";
import SetTeamMatchPointsModal from "../modals/live/teams/set-team-match-points-modal";
import Modal from "../modals/modal";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface TeamsActionsProps {
  serverId: string;
  teams: Record<number, Team>;
  type: string;
}

export default function TeamsActions({
  serverId,
  teams,
  type,
}: TeamsActionsProps) {
  const [isOpenSetMapPoints, setIsOpenSetMapPoints] = useState(false);
  const [isOpenSetMatchPoints, setIsOpenSetMatchPoints] = useState(false);

  const isTmwt = type === "tmwt" || type === "tmwc";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsOpenSetMapPoints(true)}>
            Set Team Map Points
          </DropdownMenuItem>
          {isTmwt && (
            <DropdownMenuItem onClick={() => setIsOpenSetMatchPoints(true)}>
              Set Team Match Points
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal isOpen={isOpenSetMapPoints} setIsOpen={setIsOpenSetMapPoints}>
        <SetTeamMapPointsModal serverId={serverId} data={{ teams, type }} />
      </Modal>

      <Modal isOpen={isOpenSetMatchPoints} setIsOpen={setIsOpenSetMatchPoints}>
        <SetTeamMatchPointsModal serverId={serverId} data={teams} />
      </Modal>
    </>
  );
}
