"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CompetitionNode } from "@/hooks/tournaments/competitions/use-competition-tree";
import { cn, generatePath } from "@/lib/utils";
import { routes } from "@/routes";
import { IconChevronUp } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
//import CompetitionStatusBadge from "../status/competition-status-badge";
import MatchStatusBadge from "../status/match-status-badge";
import CompetitionActions from "./competition-actions";

interface CompetitionTreeProps {
  tournamentId: number;
  tree: CompetitionNode;
  sectionIndex: number;
  subsectionIndex?: number;
  isLast?: boolean;
}

export default function CompetitionTree({
  tournamentId,
  tree,
  sectionIndex,
  subsectionIndex = 0,
  isLast = true,
}: CompetitionTreeProps) {
  const router = useRouter();

  // Stage children toggle
  const [isOpen, setIsOpen] = useState(sectionIndex === 0);

  return (
    <div>
      <div className="flex gap-2 sm:gap-4">
        <div className="flex flex-col items-center">
          <Card className="rounded-full w-10 min-h-10 sm:w-12 sm:min-h-12 grid place-items-center font-semibold text-sm sm:text-base">
            {sectionIndex + 1}
            {String.fromCharCode(97 + subsectionIndex)}
          </Card>
          {(!isLast || isOpen) && <div className="w-px bg-border h-full"></div>}
        </div>

        <Card
          onClick={(e) => {
            e.stopPropagation();
            router.push(
              generatePath(routes.tournaments.stage, {
                id: tournamentId.toString(),
                stageId: tree.id.toString(),
              }),
            );
          }}
          className="flex-1 gap-2 mb-4 p-3 min-h-20 cursor-pointer [&:has(.match-card:hover)]:border-border [&:has(.dropdown-menu:hover)]:border-border hover:border-white transition-all"
        >
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
            <div className="flex flex-1 flex-col gap-1 sm:gap-0">
              <div className="flex justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <h3 className="text-lg font-semibold truncate max-w-51 lg:max-w-118 xl:max-w-180">
                    {tree.name}
                  </h3>

                  {/* <CompetitionStatusBadge status={tree.status} /> */}
                </div>

                <div
                  className="dropdown-menu ml-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CompetitionActions competition={tree} />
                </div>
              </div>

              {/* {(tree.startingAt || tree.endingAt) && (
                <div className="flex gap-2 items-center text-muted-foreground text-sm">
                  <IconCalendar size={16} />

                  {tree.startingAt && (
                    <span>
                      {tree.startingAt.toDate().toLocaleDateString("en-UK", {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}

                  {tree.startingAt && tree.endingAt && <span>-</span>}

                  {tree.endingAt && (
                    <span>
                      {tree.endingAt.toDate().toLocaleDateString("en-UK", {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              )} */}

              {/* <div className="space-x-2 sm:mt-1">
                <RegistrationBadge
                  registrationSettings={tree.registrationSettings}
                />
              </div> */}
            </div>
          </div>

          <Separator />

          {tree.matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No matches in this stage.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
              {tree.matches.map((match, i) => (
                <Card
                  key={match.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("match", match.id);
                  }}
                  className="match-card p-2 rounded-lg cursor-pointer hover:border-white transition-all"
                >
                  <div className="flex gap-2 items-center justify-between">
                    <span className="text-sm">Match {i + 1}</span>
                    <MatchStatusBadge status={match.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      {tree.children.length > 0 && (
        <div className="flex gap-4 w-full">
          {!isLast && !isOpen && (
            <div className="flex flex-col items-center w-12">
              <div className="w-px bg-border flex-1"></div>
            </div>
          )}

          <div className="flex flex-1 flex-col">
            <div className="flex flex-col mb-4">
              {isOpen &&
                tree.children.map((child, i) => (
                  <CompetitionTree
                    key={child.id}
                    tournamentId={tournamentId}
                    tree={child}
                    sectionIndex={sectionIndex + 1}
                    subsectionIndex={i}
                    isLast={i === tree.children.length - 1}
                  />
                ))}

              <div className={cn("w-full", (isLast || isOpen) && "pl-16")}>
                <div
                  className="relative flex items-center gap-2"
                  onClick={() => setIsOpen((prev) => !prev)}
                >
                  <Separator className="flex-1" />
                  <Button
                    size={"icon"}
                    variant="ghost"
                    className="shrink-0 px-2"
                  >
                    <IconChevronUp
                      className={cn(isOpen ? "rotate-0" : "rotate-180")}
                    />
                  </Button>
                  <Separator className="flex-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
