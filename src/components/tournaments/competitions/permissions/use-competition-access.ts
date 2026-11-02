"use client";
import { tables } from "@/lib/server-manager";
import { useTable } from "spacetimedb/react";

// The client cache merges the rows of a view for all args, so they are filtered by competition.
export function useCompetitionAccess(competitionId: number) {
  const [memberRows, isReady] = useTable(tables.competitionMembers({ competitionId }));
  const [roleRows] = useTable(tables.competitionRoles({ competitionId }));
  const [roleMemberRows] = useTable(tables.competitionRoleMembers({ competitionId }));
  const [mineRows] = useTable(tables.myCompetitionPermissions({ competitionId }));

  const roles = roleRows.filter((r) => r.competitionId === competitionId);
  return {
    isReady,
    members: memberRows.filter((m) => m.competitionId === competitionId),
    roles,
    roleMembers: roleMemberRows.filter((rm) => roles.some((r) => r.id === rm.roleId)),
    mine: mineRows.find((r) => r.competitionId === competitionId)?.permissions ?? 0n,
  };
}
