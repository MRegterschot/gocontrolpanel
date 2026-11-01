"use client";

import { tables } from "@/lib/server-manager";
import { RegisterationPlayer } from "@/lib/server-manager/types";
import { useTable } from "spacetimedb/react";

export type Registration = {
  name: string;
} & RegisterationPlayer;

export function useRegistrationsByCompetitionId(competitionId: number) {
  const [[registration]] = useTable(tables.competitionRegistrations({ competitionId }));
  const [players] = useTable(
    tables.tabRegisterationPlayer.where((r) => r.registrationId.eq(registration?.id ?? 0)),
  );
  const [users] = useTable(tables.tabUser);

  const registrations: Registration[] = players.map((row) => ({
    ...row,
    name: users.find((u) => u.id === row.userId)?.name || "Unknown",
  }));

  return { registrations, registration };
}
