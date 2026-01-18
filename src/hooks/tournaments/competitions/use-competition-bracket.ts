import {
  CompetitionNodePosition,
  CompetitionV1,
  tables,
  TmMatchV1,
} from "@/lib/tourney-manager";
import { useMemo } from "react";
import { Infer } from "spacetimedb";
import { eq, useTable, where } from "spacetimedb/react";

type CompetitionBase = Infer<typeof CompetitionV1>;
type MatchNodeWithPos = Infer<typeof TmMatchV1> & {
  position: Infer<typeof CompetitionNodePosition>["position"];
};

export type Bracket = {
  nodes: MatchNodeWithPos[];
  edges: { from: number; to: number; type: "Waiting" | "Data" }[];
};

export function useCompetitionBracket(competition: CompetitionBase) {
  const [matchRows] = useTable(
    tables.tmMatch,
    where(eq("competitionId", competition.id)),
  );

  const [connectionRows] = useTable(
    tables.competitionConnection,
    where(eq("competitionId", competition.id)),
  );

  const [nodePositionRows] = useTable(
    tables.competitionNodePosition,
    where(eq("competitionId", competition.id)),
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
          conn.connectionFrom.tag === "MatchV1" &&
          conn.connectionTo.tag === "MatchV1",
      )
      .map((conn) => ({
        from: conn.connectionFrom.value,
        to: conn.connectionTo.value,
        type: conn.connectionSettings.tag,
      }));

    return { nodes, edges };
  }, [matchRows, connectionRows, nodePositionRows]);

  return bracket;
}
