import { cn, formatTime } from "@/lib/utils";
import { ActiveRound } from "@/types/live";
import { PlayerInfo } from "@/types/player";
import { IconFlag, IconHash, IconPennant, IconX } from "@tabler/icons-react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface LiveRoundProps {
  activeRound: ActiveRound;
  playerList: PlayerInfo[];
  isWarmUp: boolean;
  warmUpRound?: number;
  warmUpTotalRounds?: number;
  isPaused: boolean;
}

export default function LiveRound({
  activeRound,
  playerList,
  isWarmUp,
  warmUpRound,
  warmUpTotalRounds,
  isPaused,
}: LiveRoundProps) {
  return (
    <Card
      className={cn(
        "flex flex-1 flex-col gap-2 items-center p-4",
        isWarmUp && "border-warmup bg-muted-warmup",
      )}
    >
      {isWarmUp && (
        <div className="flex gap-2 justify-between w-full">
          <span className="text-xl font-bold">Warm Up</span>
          <span className="text-xl font-bold">
            {warmUpRound} / {warmUpTotalRounds}
          </span>
        </div>
      )}

      {isPaused && (
        <div className="flex justify-center w-full">
          <span className="text-xl font-bold">Paused</span>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[50px] pl-4">
              <IconHash size={14} />
            </TableHead>
            <TableHead className="font-bold">Player</TableHead>
            <TableHead className="font-bold text-end">Time</TableHead>
            <TableHead className="font-bold text-center">
              <IconPennant size={20} />
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {activeRound.players &&
            [...Object.values(activeRound.players)]
              .sort((a, b) => {
                if (b.checkpoint !== a.checkpoint) {
                  return b.checkpoint - a.checkpoint;
                }
                return a.time - b.time;
              })
              .map((player, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell className="w-[50px]">
                    <Badge variant="outline" className="text-md font-bold">
                      {i + 1}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {playerList.find((p) => p.login === player.login)
                      ?.nickName || player.login}
                  </TableCell>
                  <TableCell className="min-w-[92px] text-end">
                    {formatTime(player.time)}
                  </TableCell>
                  <TableCell className="text-center">
                    {player.hasFinished ? (
                      <IconFlag size={20} />
                    ) : player.hasGivenUp ? (
                      <IconX size={20} />
                    ) : (
                      player.checkpoint
                    )}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </Card>
  );
}
