"use client";

import { useCompetitionTree } from "@/hooks/tournaments/competitions/use-competition-tree";
import CompetitionTree from "../competitions/competition-tree";

export default function TournamentCompetitionTree({
  tournamentId,
}: {
  tournamentId: number;
}) {
  const { tree } = useCompetitionTree(tournamentId);

  if (!tree) {
    return <p>No stages found for this tournament.</p>;
  }

  console.log("Competition tree:", tree);

  return (
    <div className="flex flex-col">
      {tree.children.map((child, i) => (
        <CompetitionTree
          key={child.id}
          tree={child}
          sectionIndex={0}
          subsectionIndex={i}
          isLast={i === tree.children.length - 1}
        />
      ))}
    </div>
  );
}
