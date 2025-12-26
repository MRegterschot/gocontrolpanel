import { CompetitionV1, tables } from "@/lib/tourney-manager";
import { useMemo } from "react";
import { Infer } from "spacetimedb";
import { eq, useTable, where } from "spacetimedb/react";

type CompetitionBase = Infer<typeof CompetitionV1>;

export interface CompetitionNode extends CompetitionBase {
  children: CompetitionNode[];
}

export function useCompetitionTree(tournamentId: number) {
  const [competitionRows] = useTable(
    tables.competition,
    where(eq("tournamentId", tournamentId)),
  );

  const tree = useMemo<CompetitionNode | null>(() => {
    if (!competitionRows || competitionRows.length === 0) return null;

    const compMap = new Map<number, CompetitionBase>(
      competitionRows.map((c) => [c.id, c]),
    );

    function buildNode(id: number): CompetitionNode | null {
      const comp = compMap.get(id);
      if (!comp) return null;

      const node: CompetitionNode = {
        ...comp,
        children: [],
      };

      const childRows = competitionRows.filter((c) => c.parentId === id);
      for (const child of childRows) {
        const childNode = buildNode(child.id);
        if (childNode) node.children.push(childNode);
      }

      return node;
    }

    const root = competitionRows.find((c) => c.parentId == null);
    if (!root) return null;

    return buildNode(root.id);
  }, [competitionRows, tournamentId]);

  return { tree };
}
