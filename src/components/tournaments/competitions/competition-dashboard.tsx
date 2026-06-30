"use client";

import { useCompetition } from "@/hooks/tournaments/competitions/use-competition";
import CompetitionBracket from "./bracket/competition-bracket";
import CompetitionInfo from "./competition-info";

export default function CompetitionDashboard({
  competitionId,
}: {
  competitionId: number;
}) {
  const { competition, isReady } = useCompetition(competitionId);

  if (!isReady) {
    return <span>Loading...</span>;
  }

  if (!competition) {
    return <span>Competition not found</span>;
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-4">
      <CompetitionInfo competition={competition} />
      <CompetitionBracket competition={competition} />
    </div>
  );
}
