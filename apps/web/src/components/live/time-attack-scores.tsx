import { cn, formatTime } from "@/lib/utils";
import { LiveInfo } from "@/types/live";
import { IconHash } from "@tabler/icons-react";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface TimeAttackScoresProps {
  liveInfo: LiveInfo;
}

export default function TimeAttackScores({ liveInfo }: TimeAttackScoresProps) {
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
              <TableHead className="font-bold">Best Time</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {liveInfo.players &&
              Object.values(liveInfo.players)
                .sort((a, b) => {
                  if (a.bestTime !== b.bestTime) {
                    return a.bestTime - b.bestTime;
                  }
                  return a.name.localeCompare(b.name);
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
                    <TableCell>{formatTime(player.bestTime)}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
