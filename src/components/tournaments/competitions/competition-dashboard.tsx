"use client";

import { tables } from "@/lib/tourney-manager";
import { eq, useTable, where } from "spacetimedb/react";
import CompetitionBracket from "./bracket/competition-bracket";
import CompetitionInfo from "./competition-info";

export default function CompetitionDashboard({
  competitionId,
}: {
  competitionId: number;
}) {
  const [competitionRows] = useTable(
    tables.competition,
    where(eq("id", competitionId)),
  );

  const competition = competitionRows[0];

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
