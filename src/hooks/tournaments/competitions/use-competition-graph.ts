import { tables } from "@/lib/server-manager";
import {
  CompetitionConnection,
  CompetitionNodePosition,
  CompetitionV1,
  InputV1,
  LeaderboardV2,
  MatchV1,
  OutputV1,
  Registration,
} from "@/lib/server-manager/types";
import { useMemo } from "react";
import { useTable } from "spacetimedb/react";



export type Graph = {
  nMatchV1: readonly MatchV1[],
  nCompetitionV1: readonly CompetitionV1[],
  nRegistrationV1: readonly Registration[],
  nLeaderboardV2: readonly LeaderboardV2[],
  nInputV1: readonly InputV1[],
  nOutputV1: readonly OutputV1[],
  connections: readonly CompetitionConnection[],
  nodePositions: readonly CompetitionNodePosition[]
};

export function useCompetitionGraph(competition: CompetitionV1) {
  const [connections, connectionsReady] = useTable(
    tables.competitionConnections({ competitionId: competition.id })
  );

  const [nodePositions, positionsReady] = useTable(
    tables.competitionNodePositions({ competitionId: competition.id })
  );


  const [nMatchV1, nMatchV1Ready] = useTable(
    tables.competitionMatches({ competitionId: competition.id })
  );

  const [nRegistrationV1, nRegistrationV1Ready] = useTable(
    tables.competitionRegistrations({ competitionId: competition.id })
  );

  const [nCompetitionV1, nCompetitionV1Ready] = useTable(
    tables.competitionCompetitions({ competitionId: competition.id })
  );

  const [nInputV1, nInputV1Ready] = useTable(
    tables.competitionInputs({ competitionId: competition.id })
  );

  const [nOutputV1, nOutputV1Ready] = useTable(
    tables.competitionOutput({ competitionId: competition.id })
  );

  const [nLeaderboardV2, nLeaderboardV2Ready] = useTable(
    tables.competitionLeaderboards({ competitionId: competition.id })
  );

  const graph = useMemo<Graph>(() => {
    const allReady = nMatchV1Ready && connectionsReady && positionsReady && nRegistrationV1Ready && nCompetitionV1Ready && nInputV1Ready && nOutputV1Ready && nLeaderboardV2Ready;

    if (!allReady) {
      return {
        nMatchV1: [],
        nCompetitionV1: [],
        nInputV1: [],
        nLeaderboardV2: [],
        nOutputV1: [],
        nRegistrationV1: [],
        connections: [],
        nodePositions: [],
      };
    }

    return { nMatchV1, connections, nodePositions, nCompetitionV1, nRegistrationV1, nLeaderboardV2, nOutputV1, nInputV1 };
  }, [connections, nodePositions, nMatchV1, nMatchV1Ready, nRegistrationV1, nCompetitionV1, nInputV1, nOutputV1, nLeaderboardV2, nOutputV1, nInputV1,
    connectionsReady, positionsReady, nMatchV1Ready, nRegistrationV1Ready, nCompetitionV1Ready, nInputV1Ready, nOutputV1Ready, nLeaderboardV2Ready]);

  return graph;
}
