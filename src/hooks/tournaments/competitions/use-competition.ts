"use client";

import { tables } from "@/lib/server-manager";
import { CompetitionV1, Registration } from "@/lib/server-manager/types";
import { useTable } from "spacetimedb/react";

export type Competition = {
  registration?: Registration;
} & CompetitionV1;

export function useCompetition(competitionId: number) {
  const [competitionRows, isReady] = useTable(
    tables.competition.where((row) => row.id.eq(competitionId)),
  );

  const [registrationRows] = useTable(
    tables.unstable_registration.where((row) => row.parentId.eq(competitionId)),
  );

  const competition = competitionRows[0];
  const registration = registrationRows[0];

  if (competition && registration) {
    return {
      competition: {
        ...competition,
        registration,
      },
      isReady,
    };
  }

  return { competition, isReady };
}
