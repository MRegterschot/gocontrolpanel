"use client";

import { tables } from "@/lib/server-manager";
import { RegisterationPlayer } from "@/lib/server-manager/types";
import { useTable } from "spacetimedb/react";

export type Registration = {
  name: string;
} & RegisterationPlayer;

export function useRegistrationsByCompetitionId(competitionId: number) {
  const [registrationRows] = useTable(
    tables.unstable_registration.where((row) => row.parentId.eq(competitionId)),
  );

  const registration = registrationRows[0];

  const [registeredPlayersRows] = useTable(tables.tab_registeration_player);

  const [userRows] = useTable(tables.tab_user);

  const registrations: Registration[] = registeredPlayersRows
    .filter((row) => row.registrationId === registration?.id)
    .map((row) => {
      const user = userRows.find((u) => u.id === row.userId);
      return {
        ...row,
        name: user?.name || "Unknown",
      };
    });

  return { registrations, registration };
}
