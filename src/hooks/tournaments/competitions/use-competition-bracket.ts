import { CompetitionV1, tables, TmMatchV1 } from "@/lib/tourney-manager";
import { useMemo } from "react";
import { Infer } from "spacetimedb";
import { eq, useTable, where } from "spacetimedb/react";

type CompetitionBase = Infer<typeof CompetitionV1>;

export type Bracket = {
  nodes: Infer<typeof TmMatchV1>[];
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

  const bracket = useMemo<Bracket>(() => {
    const nodes = [...matchRows];

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
  }, [matchRows, connectionRows]);

  return bracket;
}
