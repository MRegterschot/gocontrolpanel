"use client";

import Modal from "@/components/modals/modal";
import CreateCompetitionModal from "@/components/modals/tournaments/competition/create-competition";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CompetitionNode } from "@/hooks/tournaments/competitions/use-competition-tree";
import { cn } from "@/lib/utils";
import { IconChevronUp, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import CompetitionStatusBadge from "../status/competition-status-badge";
import MatchStatusBadge from "../status/match-status-badge";
import Registration from "./registration";

interface CompetitionTreeProps {
  tree: CompetitionNode;
  sectionIndex: number;
  subsectionIndex?: number;
  isLast?: boolean;
}

export default function CompetitionTree({
  tree,
  sectionIndex,
  subsectionIndex = 0,
  isLast = true,
}: CompetitionTreeProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <Card className="rounded-full w-12 min-h-12 grid place-items-center font-semibold">
            {sectionIndex + 1}
            {String.fromCharCode(97 + subsectionIndex)}
          </Card>
          {(!isLast || isOpen) && <div className="w-px bg-border h-full"></div>}
        </div>

        <Card className="flex-1 gap-2 mb-4 p-4 min-h-20">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold truncate max-w-28 lg:max-w-92 xl:max-w-128">
                {tree.name}
              </h3>

              <div className="space-x-2">
                <CompetitionStatusBadge status={tree.status} />

                <Registration
                  registrationSettings={tree.registrationSettings}
                />
              </div>
            </div>

            <Modal>
              <CreateCompetitionModal data={tree.id} />
              <Button variant={"outline"}>
                <IconPlus />
                Add Stage
              </Button>
            </Modal>
          </div>

          <Separator />

          {tree.matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No matches in this stage.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tree.matches.map((match, i) => (
                <Card key={match.id} className="p-2 rounded-lg">
                  <div className="flex gap-2 items-center">
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
