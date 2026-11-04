"use client";

import { tables } from "@/lib/server-manager";
import { useTable } from "spacetimedb/react";
import CompetitionTree from "../competitions/competition-tree";

export default function TournamentCompetitionTree({
  tournamentId,
}: {
  tournamentId: number;
}) {
  const [[project]] = useTable(tables.myProjects.where((p) => p.id.eq(tournamentId)));

  if (!project) {
    return <p>No stages found for this tournament.</p>;
  }

  return (
    <div className="flex flex-col">
      <CompetitionTree
        tournamentId={tournamentId}
        competitionId={project.rootCompetition}
        sectionIndex={0}
      />
    </div>
  );
}
