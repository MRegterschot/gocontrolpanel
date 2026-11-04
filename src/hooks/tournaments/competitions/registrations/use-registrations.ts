"use client";

import { tables } from "@/lib/server-manager";
import { RegisterationPlayer } from "@/lib/server-manager/types";
import { useUsers } from "@/providers/users-provider";
import { useTable } from "spacetimedb/react";

export type Registration = {
  name: string;
} & RegisterationPlayer;

export function useRegistrationsByCompetitionId(competitionId: number) {
  const [rows] = useTable(tables.competitionRegistrations({ competitionId }));
  const registration = rows.find((r) => r.parentId === competitionId);
  const registrationId = registration?.id ?? 0;
  const [playerRows] = useTable(tables.registrationPlayers({ registrationId }));
  const players = playerRows.filter((p) => p.registrationId === registrationId);
  const users = useUsers();

  const registrations: Registration[] = players.map((row) => ({
    ...row,
    name: users.get(row.userId)?.name || "Unknown",
  }));

  return { registrations, registration };
}
