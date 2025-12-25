"use client";

import { useCompetitionTree } from "@/hooks/tournaments/competitions/use-competition-tree";
import CompetitionTree from "../competitions/competition-tree";

export default function TournamentCompetitionTree({
  tournamentId,
}: {
  tournamentId: number;
}) {
  const { tree, isLoading } = useCompetitionTree(tournamentId);

  if (isLoading) {
    return <p>Loading stages...</p>;
  }

  if (!tree) {
    return <p>No stages found for this tournament.</p>;
  }

  return (
    <div className="flex flex-col">
      <CompetitionTree tree={tree} sectionIndex={0}  />
    </div>
  );
}
