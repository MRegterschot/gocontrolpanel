import { procedures, tables } from "@/lib/server-manager";
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
import { useProcedure, useTable } from "spacetimedb/react";
import { useSpacetimeProcedure } from "../use-spacetime-procedure";



export type Graph = {
  nMatchV1: readonly MatchV1[],
  nCompetitionV1: CompetitionV1[],
  nRegistrationV1: readonly Registration[],
  nLeaderboardV2: LeaderboardV2[],
  nInputV1: InputV1[],
  nOutputV1: OutputV1[],
  connections: readonly CompetitionConnection[],
  nodePositions: readonly CompetitionNodePosition[]
};

export function useCompetitionGraph(competition: CompetitionV1) {
  const [nMatchV1, nMatchV1Ready] = useTable(
    tables.tabMatch.where((row) => row.parentId.eq(competition.id)),
  );


  const [nRegistrationV1, nRegistrationV1Ready] = useTable(
    tables.tabRegistration.where((row) => row.parentId.eq(competition.id)),
  );


  const [connections, connectionsReady] = useTable(
    tables.unstableCompetitionConnection.where((row) =>
      row.competitionId.eq(competition.id),
    ),
  );


  const [nodePositions, positionsReady] = useTable(
    tables.myNodePositions.where((row) =>
      row.competitionId.eq(competition.id),
    ),
  );


  const competition_competitions = useProcedure(procedures.unstableCompetitionCompetitions)
  const competitionCompetitionsResult = useSpacetimeProcedure(competition_competitions, {
    competitionId: competition.id
  }).data;
  const nCompetitionV1 = useMemo(() => {
    return competitionCompetitionsResult ? competitionCompetitionsResult : [];
  }, [competitionCompetitionsResult]);


  const competition_inputs = useProcedure(procedures.unstableCompetitionInputs)
  const competitionInputsResult = useSpacetimeProcedure(competition_inputs, {
    competitionId: competition.id
  }).data;
  const nInputV1 = useMemo(() => {
    return competitionInputsResult ? competitionInputsResult : [];
  }, [competitionInputsResult]);


  const competition_output = useProcedure(procedures.unstableCompetitionOutput)
  const competitionOutputResult = useSpacetimeProcedure(competition_output, {
    competitionId: competition.id
  }).data;
  const nOutputV1 = useMemo(() => {
    return competitionOutputResult ? competitionOutputResult : [];
  }, [competitionOutputResult]);


  const competition_leaderboards = useProcedure(procedures.unstableCompetitionLeaderboards)
  const competitionLeaderboardsResult = useSpacetimeProcedure(competition_leaderboards, {
    competitionId: competition.id
  }).data;
  const nLeaderboardV2 = useMemo(() => {
    return competitionLeaderboardsResult ? competitionLeaderboardsResult : [];
  }, [competitionLeaderboardsResult]);



  const graph = useMemo<Graph>(() => {
    const allReady = nMatchV1Ready && connectionsReady && positionsReady && nRegistrationV1Ready;

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
  }, [nMatchV1, connections, nodePositions, nCompetitionV1, nMatchV1Ready, connectionsReady, positionsReady, nRegistrationV1, nRegistrationV1Ready, nLeaderboardV2, nOutputV1, nInputV1]);

  return graph;
}
