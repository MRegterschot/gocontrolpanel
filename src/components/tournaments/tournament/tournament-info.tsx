"use client";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import EditTournamentDescriptionForm from "@/forms/tournaments/tournament/edit-tournament-description-form";
import { tables } from "@/lib/tourney-manager";
import { IconCalendar, IconEdit, IconUser } from "@tabler/icons-react";
import { useState } from "react";
import { Timestamp } from "spacetimedb";
import { eq, useTable, where } from "spacetimedb/react";
import TournamentStatusBadge from "../status/tournament-status-badge";

export default function TournamentInfo({
  tournamentId,
}: {
  tournamentId: number;
}) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  const [tournamentRows] = useTable(
    tables.tournament,
    where(eq("id", tournamentId)),
  );

  const tournament = tournamentRows[0];

  const [userRows] = useTable(
    tables.user,
    where(eq("accountId", tournament?.creator)),
  );

  const creatorUser = userRows[0];

  if (!tournament) {
    return <span>Tournament not found</span>;
  }

  tournament.startingAt = Timestamp.fromDate(new Date());
  tournament.endingAt = Timestamp.fromDate(new Date());

  return (
    <Card className="p-4 flex flex-col sm:flex-row justify-between gap-4 sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
            <h2
              className="text-lg font-bold truncate max-w-48 lg:max-w-92 xl:max-w-128"
              title={tournament.name}
            >
              {tournament.name}
            </h2>
            <TournamentStatusBadge status={tournament.status} />
          </div>

          <div className="flex flex-col">
            {(tournament.startingAt || tournament.endingAt) && (
              <div className="flex gap-2 items-center text-muted-foreground text-sm">
                <IconCalendar size={16} />

                {tournament.startingAt && (
                  <span>
                    {tournament.startingAt
                      .toDate()
                      .toLocaleDateString("en-UK", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                  </span>
                )}

                {tournament.startingAt && tournament.endingAt && <span>-</span>}

                {tournament.endingAt && (
                  <span>
                    {tournament.endingAt.toDate().toLocaleDateString("en-UK", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            )}
            {creatorUser && (
              <div className="flex gap-2 text-muted-foreground text-sm">
                <IconUser size={16} />
                {creatorUser.name}
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex gap-2 items-center">
            <span>Description</span>
            <IconEdit
              size={16}
              onClick={() => setIsEditingDescription((prev) => !prev)}
            />
          </div>

          {isEditingDescription ? (
            <EditTournamentDescriptionForm
              tournament={tournament}
              callback={() => setIsEditingDescription(false)}
            />
          ) : (
            tournament.description && (
              <p className="text-muted-foreground">{tournament.description}</p>
            )
          )}
        </div>
      </div>
    </Card>
  );
}
