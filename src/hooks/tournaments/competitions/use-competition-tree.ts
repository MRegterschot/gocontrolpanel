import { tables } from "@/lib/server-manager";
import { MatchV1 } from "@/lib/server-manager/types";
import { useMemo } from "react";
import { Infer } from "spacetimedb";
import { useTable } from "spacetimedb/react";
import { Competition } from "./use-competition";

export interface CompetitionNode extends Competition {
  children: CompetitionNode[];
  matches: Infer<typeof MatchV1>[];
  // registeredPlayers: Infer<typeof RegisteredPlayer>[];
}

export function useCompetitionTree(tournamentId: number) {
  const [matches] = useTable(tables.tab_match);

  const [competitions] = useTable(tables.project_competition_descendants); // TODO, filter by tournamentId
  const [registrationRows] = useTable(tables.unstable_registration);

  // const registeredPlayerRows = tables.temp_registration_player.where(r => r.registrationId.eq(tournamentId));

  const tree = useMemo<CompetitionNode | null>(() => {
    if (!competitions || competitions.length === 0) return null;

    const compMap = new Map<number, Competition>(
      competitions.map((c) => [c.id, c]),
    );

    function buildNode(id: number): CompetitionNode | null {
      const comp = compMap.get(id);
      if (!comp) return null;

      const node: CompetitionNode = {
        ...comp,
        children: [],
        matches: matches.filter((m) => m.parentId === id),
        registration: registrationRows.find((r) => r.parentId === id),
        // registeredPlayers: registeredPlayerRows.filter(
        //   (rp) => rp.competitionId === id,
        // ),
      };

      const childRows = competitions.filter((c) => c.parentId === id);
      for (const child of childRows) {
        const childNode = buildNode(child.id);
        if (childNode) node.children.push(childNode);
      }

      node.children.sort((a, b) => a.id - b.id); // Sort children by ID so order is consistent

      return node;
    }

    const root = competitions.find((c) => c.parentId == 0);
    if (!root) return null;

    return buildNode(root.id);
  }, [competitions, matches, registrationRows, tournamentId]);

  return { tree };
}
