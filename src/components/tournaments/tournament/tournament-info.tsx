"use client";

import Modal from "@/components/modals/modal";
import CreateCompetitionModal from "@/components/modals/tournaments/competition/create-competition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { tables } from "@/lib/tourney-manager";
import { IconPlus, IconUser } from "@tabler/icons-react";
import { eq, useTable, where } from "spacetimedb/react";
import TournamentStatusBadge from "../status/tournament-status-badge";

export default function TournamentInfo({
  tournamentId,
}: {
  tournamentId: number;
}) {
  const [tournamentRows] = useTable(
    tables.tournament,
    where(eq("id", tournamentId)),
  );

  const tournament = tournamentRows[0];

  const [competitionRows] = useTable(
    tables.competition,
    where(eq("tournamentId", tournament?.id || -1)), // Use -1 to ensure no matches if tournament is undefined
  );

  const rootCompetition = competitionRows.find((c) => !c.parentId);

  const [userRows] = useTable(
    tables.user,
    where(eq("accountId", tournament?.creator)),
  );

  const creatorUser = userRows[0];

  if (!tournament) {
    return <span>Tournament not found</span>;
  }

  return (
    <Card className="p-4 flex flex-col sm:flex-row justify-between gap-4 sm:items-end">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <h2
            className="text-lg font-bold truncate max-w-48 lg:max-w-92 xl:max-w-128"
            title={tournament.name}
          >
            {tournament.name}
          </h2>
          <TournamentStatusBadge status={tournament.status} />
        </div>

        <div>
          {creatorUser && (
            <Badge variant={"outline"}>
              <IconUser />
              {creatorUser.name}
            </Badge>
          )}
        </div>

        {tournament.description && (
          <p className="text-sm text-muted-foreground">
            {tournament.description}
          </p>
        )}
      </div>

      {rootCompetition && (
        <Modal>
          <CreateCompetitionModal data={rootCompetition.id} />
          <Button variant={"outline"}>
            <IconPlus />
            Add Stage
          </Button>
        </Modal>
      )}
    </Card>
  );
}
