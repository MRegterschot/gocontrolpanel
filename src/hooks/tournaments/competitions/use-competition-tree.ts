import { Competition, tables } from "@/lib/tourney-manager";
import { useMemo } from "react";
import { Infer } from "spacetimedb";
import { eq, useTable, where } from "spacetimedb/react";

type CompetitionBase = Mutable<Infer<typeof Competition>>;

// Our new tree node type
export interface CompetitionNode extends CompetitionBase {
  children: CompetitionNode[];
}

export function useCompetitionTree(tournamentId: number) {
  const [competitionRows, isLoading] = useTable(
    tables.competition,
    where(eq("tournamentId", tournamentId)),
  );

  const tree = useMemo(() => {
    if (!competitionRows) return null;

    // Store originals for lookup
    const compMap = new Map(competitionRows.map((c) => [c.id, c]));

    function buildNode(id: number): CompetitionNode | null {
      const comp = compMap.get(id);
      if (!comp) return null;

      const node = {
        ...comp,
        children: [] as CompetitionNode[],
      };

      for (const link of comp.competitions.nodes) {
        if (link.weight.tag === "CompetitionV1") {
          const childId = link.weight.value;
          const childNode = buildNode(childId);
          if (childNode) node.children.push(childNode);
        }
      }

      return node;
    }

    const root = competitionRows.find((c) => !c.parentId);
    if (!root) return null; // defensive fallback

    return buildNode(root.id);
  }, [competitionRows]);

  return { tree, isLoading };
}
