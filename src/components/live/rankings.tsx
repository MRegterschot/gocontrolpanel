import { formatTime } from "@/lib/utils";
import { PlayerRound, Team } from "@/types/live";
import {
  IconFlag2,
  IconHash,
  IconTrophy,
  IconTrophyFilled,
  IconX,
} from "@tabler/icons-react";
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

interface RankingsProps {
  players?: Record<string, PlayerRound>;
  teams?: Record<number, Team>;
  type: string;
}

export default function Rankings({ players, teams, type }: RankingsProps) {
  return (
    <Card className="p-4">
      <h2 className="text-lg font-bold">Rankings</h2>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[50px] font-bold pl-4">
              <IconHash size={14} />
            </TableHead>
            <TableHead className="font-bold">Player</TableHead>
            {["teams", "tmwc", "tmwt"].includes(type) && (
              <TableHead className="font-bold">Team</TableHead>
            )}
            {!["timeattack", "knockout"].includes(type) && (
              <TableHead className="font-bold">Points</TableHead>
            )}
            <TableHead className="font-bold">Best Time</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {players &&
            Object.values(players)
              .filter(
                (player) =>
                  type === "reversecup" && player.matchPoints > -10000,
              )
              .sort((a, b) => {
                if (b.matchPoints !== a.matchPoints) {
                  return b.matchPoints - a.matchPoints;
                }
                return a.bestTime - b.bestTime;
              })
              .map((player, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell>
                    <Badge variant="outline" className="text-md font-bold">
                      {i + 1}
                    </Badge>
                  </TableCell>
                  <TableCell>{player.name}</TableCell>
                  {["teams", "tmwt", "tmwc"].includes(type) && (
                    <TableCell>{teams && teams[player.team]?.name}</TableCell>
                  )}
                  {["reversecup"].includes(type) && (
                    <TableCell>
                      {player.eliminated ? (
                        <IconX size={20} />
                      ) : player.lastChance ? (
                        <IconFlag2 size={20} />
                      ) : (
                        <span>{player.matchPoints}</span>
                      )}
                    </TableCell>
                  )}
                  {!["timeattack", "knockout", "reversecup"].includes(type) && (
                    <TableCell>
                      {player.winner ? (
                        <IconTrophyFilled size={20} />
                      ) : player.finalist ? (
                        <IconTrophy size={20} />
                      ) : (
                        <span>{player.matchPoints}</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>{formatTime(player.bestTime)}</TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </Card>
  );
}
