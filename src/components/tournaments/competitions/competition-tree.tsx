import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CompetitionNode } from "@/hooks/tournaments/competitions/use-competition-tree";
import { cn } from "@/lib/utils";
import {
  IconChevronDown,
  IconChevronUp,
  IconProgress,
} from "@tabler/icons-react";
import { useState } from "react";
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
  const [isOpen, setIsOpen] = useState(!tree.parentId);

  return (
    <div>
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <Card className="rounded-full w-12 min-h-12 grid place-items-center font-bold text-lg">
            {sectionIndex + 1}
            {String.fromCharCode(97 + subsectionIndex)}
          </Card>
          {(!isLast || isOpen) && <div className="w-px bg-border h-full"></div>}
        </div>

        <Card className="flex-1 gap-2 mb-4 p-4 min-h-20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{tree.name}</h3>
              <Badge variant="outline">
                <IconProgress />
                {tree.status.tag}
              </Badge>
            </div>
            <div>{tree.estimate?.toString()}</div>
          </div>

          <Separator />
          <Registration registrationRules={tree.registrationRules} />
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
                    {isOpen ? <IconChevronUp /> : <IconChevronDown />}
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
