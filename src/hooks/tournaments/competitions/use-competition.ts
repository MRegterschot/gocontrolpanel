"use client";

import { tables } from "@/lib/server-manager";
import { CompetitionV1, Registration } from "@/lib/server-manager/types";
import { useTable } from "spacetimedb/react";

export type Competition = {
  registration?: Registration;
} & CompetitionV1;

export function useCompetition(competitionId: number) {
  const [[competition], isReady] = useTable(tables.competition({ competitionId }));
  const [[registration]] = useTable(tables.competitionRegistrations({ competitionId }));

  return {
    competition: competition && ({ ...competition, registration } as Competition),
    isReady,
  };
}
