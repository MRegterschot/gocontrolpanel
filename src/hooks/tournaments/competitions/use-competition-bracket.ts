import {
  tables,
} from "@/lib/server-manager";
import { CompetitionV1, MatchV1 } from "@/lib/server-manager/types";
import { useMemo } from "react";
import { useTable } from "spacetimedb/react";


/* type MatchNodeWithPos = Infer<typeof TmMatchV1> & {
  position: Infer<typeof CompetitionNodePosition>["position"];
}; */

export type Bracket = {
  nodes: MatchV1[];
  edges: { from: number; to: number; type: "Waiting" | "Data" }[];
};

export function useCompetitionBracket(competition: CompetitionV1) {
  const [matchRows] = useTable(
    tables.my_matches.where((row) => row.parentId.eq(competition.id)),
  );

  const [connectionRows] = useTable(
    tables.my_connections.where((row) => row.competitionId.eq(competition.id)),
  );

  const [nodePositionRows] = useTable(
    tables.my_node_positions.where((row) => row.competitionId.eq(competition.id)),
  );

  const bracket = useMemo<Bracket>(() => {
    const nodes = matchRows.map((match) => {
      const nodePos = nodePositionRows.find(
        (pos) => pos.node.tag === "MatchV1" && pos.node.value === match.id,
      );
      return {
        ...match,
        position: nodePos ? nodePos.position : { x: 0, y: 0 },
      };
    });

    const edges = connectionRows
      .filter(
        (conn) =>
          conn.origin.tag === "MatchV1" &&
          conn.target.tag === "MatchV1",
      )
      .map((conn) => ({
        from: conn.origin.value,
        to: conn.target.value,
        type: conn.kind.tag,
      }));

    return { nodes, edges };
  }, [matchRows, connectionRows, nodePositionRows]);

  return bracket;
}
