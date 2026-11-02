"use client";

import { tables } from "@/lib/server-manager";
import { CompetitionV1, Registration } from "@/lib/server-manager/types";
import { useTable } from "spacetimedb/react";

export type Competition = {
  registration?: Registration;
} & CompetitionV1;

export function useCompetition(competitionId: number) {
  // The client cache merges the rows of a view for all args, so they are looked up by competition.
  const [competitions, isReady] = useTable(tables.competition({ competitionId }));
  const [registrations] = useTable(tables.competitionRegistrations({ competitionId }));
  const competition = competitions.find((c) => c.id === competitionId);
  const registration = registrations.find((r) => r.parentId === competitionId);

  return {
    competition: competition && ({ ...competition, registration } as Competition),
    isReady,
  };
}
