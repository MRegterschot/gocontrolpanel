import { cn, formatTime } from "@/lib/utils";
import { LiveInfo } from "@/types/live";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";

interface TeamScoresProps {
  liveInfo: LiveInfo;
}

export default function TeamScores({ liveInfo }: TeamScoresProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-full">
        {liveInfo.teams &&
          Object.values(liveInfo.teams).map((team) => (
            <div
              key={team.id}
              className="flex flex-1 flex-col gap-2 items-center"
            >
              <div className="flex flex-col gap-1 items-center">
                {["tmwt", "tmwc"].includes(liveInfo.type) ? (
                  <>
                    <span className="text-3xl font-bold">
                      {team.name} - {team.matchPoints}
                    </span>
                    <span className="text-3xl font-bold">{team.mapPoints}</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold">{team.name}</span>
                    <span className="text-3xl font-bold">
                      {team.matchPoints}
                    </span>
                  </>
                )}
              </div>

              <Separator />

              <Table>
                <TableBody>
                  {liveInfo.players &&
                    [...Object.values(liveInfo.players)]
                      .filter((player) => player.team === team.id)
                      .sort((a, b) => {
                        if (b.matchPoints !== a.matchPoints) {
                          return b.matchPoints - a.matchPoints;
                        }
                        return a.bestTime - b.bestTime;
                      })
                      .map((player, i) => {
                        const rank = liveInfo.players
                          ? Object.values(liveInfo.players)
                              .sort((a, b) => {
                                if (b.matchPoints !== a.matchPoints) {
                                  return b.matchPoints - a.matchPoints;
                                }
                                return a.bestTime - b.bestTime;
                              })
                              .findIndex((p) => p.name === player.name) + 1
                          : i + 1;

                        return (
                          <TableRow
                            key={i}
                            className={cn(
                              "hover:bg-transparent",
                              i % 2 === 0 && "bg-muted hover:bg-muted",
                            )}
                          >
                            <TableCell className="w-12.5">
                              <Badge
                                variant="outline"
                                className="text-md font-bold"
                              >
                                {rank}
                              </Badge>
                            </TableCell>
                            <TableCell>{player.name}</TableCell>
                            <TableCell className="text-end max-sm:hidden">
                              {formatTime(player.bestTime)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </div>
          ))}
      </div>
    </div>
  );
}
