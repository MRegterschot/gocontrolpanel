import {
  CompetitionV1,
  RegisteredPlayer,
  tables,
  TmMatchV1,
} from "@/lib/tourney-manager";
import { useMemo } from "react";
import { Infer } from "spacetimedb";
import { eq, useTable, where } from "spacetimedb/react";

type CompetitionBase = Infer<typeof CompetitionV1>;

export interface CompetitionNode extends CompetitionBase {
  children: CompetitionNode[];
  matches: Infer<typeof TmMatchV1>[];
  registeredPlayers: Infer<typeof RegisteredPlayer>[];
}

export function useCompetitionTree(tournamentId: number) {
  const [competitionRows] = useTable(
    tables.competition,
    where(eq("tournamentId", tournamentId)),
  );

  const [matchRows] = useTable(
    tables.tmMatch,
    where(eq("tournamentId", tournamentId)),
  );

  const [registeredPlayerRows] = useTable(tables.registeredPlayer);

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
        matches: matchRows.filter((m) => m.competitionId === id),
        registeredPlayers: registeredPlayerRows.filter(
          (rp) => rp.competitionId === id,
        ),
      };

      const childRows = competitionRows.filter((c) => c.parentId === id);
      for (const child of childRows) {
        const childNode = buildNode(child.id);
        if (childNode) node.children.push(childNode);
      }

      node.children.sort((a, b) => a.id - b.id); // Sort children by ID so order is consistent

      return node;
    }

    const root = competitionRows.find((c) => c.parentId == null);
    if (!root) return null;

    return buildNode(root.id);
  }, [competitionRows, matchRows, registeredPlayerRows, tournamentId]);

  return { tree };
}
