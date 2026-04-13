import { tables } from "@/lib/server-manager";
import {
  CompetitionNodePosition,
  CompetitionV1,
  MatchV1,
} from "@/lib/server-manager/types";
import { useMemo } from "react";
import { Infer } from "spacetimedb";
import { useTable } from "spacetimedb/react";

type MatchNodeWithPos = Infer<typeof MatchV1> & {
  position: Infer<typeof CompetitionNodePosition>["position"];
};

export type Bracket = {
  nodes: MatchNodeWithPos[];
  edges: { from: number; to: number; type: "Wait" | "Data" | "Action" }[];
};

export function useCompetitionBracket(competition: CompetitionV1) {
  const [matches] = useTable(
    tables.my_matches.where((row) => row.parentId.eq(competition.id)),
  );

  const [connections] = useTable(
    tables.my_connections.where((row) => row.competitionId.eq(competition.id)),
  );

  const [nodePositions] = useTable(
    tables.my_node_positions.where((row) =>
      row.competitionId.eq(competition.id),
    ),
  );

  const bracket = useMemo<Bracket>(() => {
    const nodes = matches.map((match) => {
      const nodePos = nodePositions.find(
        (pos) => pos.node.tag === "MatchV1" && pos.node.value === match.id,
      );
      return {
        ...match,
        position: nodePos ? nodePos.position : { x: 0, y: 0 },
      };
    });

    const edges = connections
      .filter(
        (conn) =>
          conn.origin.tag === "MatchV1" && conn.target.tag === "MatchV1",
      )
      .map((conn) => ({
        from: conn.origin.value,
        to: conn.target.value,
        type: conn.kind.tag,
      }));

    return { nodes, edges };
  }, [matches, connections, nodePositions]);

  return bracket;
}
