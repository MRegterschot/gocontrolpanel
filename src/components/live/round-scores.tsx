import { cn, formatTime } from "@/lib/utils";
import { LiveInfo, PlayerRound } from "@/types/live";
import {
  IconFlag2,
  IconHash,
  IconTrophyFilled,
  IconX,
} from "@tabler/icons-react";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface RoundScoresProps {
  liveInfo: LiveInfo;
}

export default function RoundScores({ liveInfo }: RoundScoresProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 w-full">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px] pl-4">
                <IconHash size={14} />
              </TableHead>
              <TableHead className="font-bold">Name</TableHead>
              <TableHead className="font-bold">Points</TableHead>
              <TableHead className="font-bold">Best Time</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {liveInfo.players &&
              Object.values(liveInfo.players)
                .filter(
                  (player) =>
                    liveInfo.type === "reversecup" &&
                    player.matchPoints > -10000,
                )
                .sort((a, b) => {
                  if (b.matchPoints !== a.matchPoints) {
                    return b.matchPoints - a.matchPoints;
                  }
                  return a.bestTime - b.bestTime;
                })
                .map((player, i) => (
                  <TableRow
                    key={i}
                    className={cn(
                      "hover:bg-transparent",
                      i % 2 === 0 && "bg-muted hover:bg-muted",
                    )}
                  >
                    <TableCell className="w-[50px]">
                      <Badge variant="outline" className="text-md font-bold">
                        {i + 1}
                      </Badge>
                    </TableCell>
                    <TableCell>{player.name}</TableCell>
                    <TableCell>
                      {liveInfo.type === "reversecup" ? (
                        <ReverseCupPoints player={player} />
                      ) : (
                        <RoundPoints player={player} />
                      )}
                    </TableCell>

                    <TableCell>{formatTime(player.bestTime)}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ReverseCupPoints({ player }: { player: PlayerRound }) {
  if (player.eliminated) {
    return <IconX size={20} />;
  } else if (player.lastChance) {
    return <IconFlag2 size={20} />;
  } else {
    return <span>{player.matchPoints}</span>;
  }
}

function RoundPoints({ player }: { player: PlayerRound }) {
  if (player.winner) {
    return <IconTrophyFilled size={20} />;
  } else if (player.finalist) {
    return <IconFlag2 size={20} />;
  } else {
    return <span>{player.matchPoints}</span>;
  }
}
