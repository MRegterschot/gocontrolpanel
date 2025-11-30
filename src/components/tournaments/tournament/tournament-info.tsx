"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { tables } from "@/lib/tourney-manager";
import { IconProgress, IconUser } from "@tabler/icons-react";
import { eq, useTable, where } from "spacetimedb/react";

export default function TournamentInfo({
  tournamentId,
}: {
  tournamentId: number;
}) {
  const [rows] = useTable(tables.tournament, where(eq('id', tournamentId)));
  const tournament = rows[0]

  if (!tournament) {
    return <span>Tournament not found</span>;
  }

  return (
    <Card className="p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold">{tournament.name}</h2>
          <Badge variant={"outline"}>
            <IconProgress />
            {tournament.status.tag}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={"outline"}>
            <IconUser />
            {tournament.creator}
          </Badge>

          {tournament.owners.map((owner) => (
            <Badge key={owner} variant={"secondary"}>
              <IconUser />
              {owner}
            </Badge>
          ))}
        </div>

        {tournament.description && (
          <p className="text-sm text-muted-foreground">
            {tournament.description}
          </p>
        )}
      </div>
    </Card>
  );
}
