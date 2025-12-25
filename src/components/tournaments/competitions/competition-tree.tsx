import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CompetitionNode } from "@/hooks/tournaments/competitions/use-competition-tree";
import { IconProgress } from "@tabler/icons-react";
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
  subsectionIndex,
  isLast = true,
}: CompetitionTreeProps) {
  return (
    <div>
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <Card className="rounded-full w-12 min-h-12 grid place-items-center font-bold text-lg">
            {sectionIndex + 1}
          </Card>
          {!isLast && <div className="w-[1px] bg-border h-full"></div>}
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

      <div className="flex flex-col">
        {tree.children.map((child, i) => (
          <CompetitionTree
            key={child.id}
            tree={child}
            sectionIndex={sectionIndex} // stay consistent down the branch
            subsectionIndex={i} // local child index
            isLast={i === tree.children.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
