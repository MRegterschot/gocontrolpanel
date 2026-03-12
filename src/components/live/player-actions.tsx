import { PlayerRound } from "@/types/live";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import SetPlayerMatchPointsModal from "../modals/live/player/set-player-match-points-modal";
import Modal from "../modals/modal";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface PlayerActionsProps {
  serverId: string;
  player: PlayerRound;
}

export default function PlayerActions({
  serverId,
  player,
}: PlayerActionsProps) {
  const [isOpenSetMatchPoints, setIsOpenSetMatchPoints] = useState(false);

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
          <DropdownMenuItem onClick={() => setIsOpenSetMatchPoints(true)}>
            Set Match Points
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal isOpen={isOpenSetMatchPoints} setIsOpen={setIsOpenSetMatchPoints}>
        <SetPlayerMatchPointsModal serverId={serverId} data={player} />
      </Modal>
    </>
  );
}
