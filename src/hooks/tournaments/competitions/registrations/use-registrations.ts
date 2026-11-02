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
  const [players] = useTable(
    tables.tabRegisterationPlayer.where((r) => r.registrationId.eq(registration?.id ?? 0)),
  );
  const users = useUsers();

  const registrations: Registration[] = players.map((row) => ({
    ...row,
    name: users.get(row.userId)?.name || "Unknown",
  }));

  return { registrations, registration };
}
