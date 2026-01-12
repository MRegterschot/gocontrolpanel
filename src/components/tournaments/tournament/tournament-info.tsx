"use client";

import ConfirmModal from "@/components/modals/confirm-modal";
import Modal from "@/components/modals/modal";
import EditTournamentModal from "@/components/modals/tournaments/tournament/edit-tournament";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { reducers, tables } from "@/lib/tourney-manager";
import { getErrorMessage } from "@/lib/utils";
import { IconCalendar, IconUser } from "@tabler/icons-react";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { eq, useReducer, useTable, where } from "spacetimedb/react";
import TournamentStatusBadge from "../status/tournament-status-badge";

export default function TournamentInfo({
  tournamentId,
}: {
  tournamentId: number;
}) {
  const updateStatus = useReducer(reducers.tournamentUpdateStatus);

  const [isEditingOpen, setIsEditingOpen] = useState(false);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);

  const [tournamentRows] = useTable(
    tables.tournament,
    where(eq("id", tournamentId)),
  );

  const tournament = tournamentRows[0];

  const [userRows] = useTable(
    tables.user,
    where(eq("accountId", tournament?.creatorAccountId)),
  );

  const creatorUser = userRows[0];

  if (!tournament) {
    return <span>Tournament not found</span>;
  }

  const handleUpdateStatus = () => {
    if (tournament.status.tag !== "Planning") {
      toast.error("Tournament status cannot be updated");
      return;
    }

    try {
      updateStatus({ tournamentId: tournament.id });
    } catch (error) {
      toast.error("Failed to update tournament status", {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <Card className="p-4 flex flex-col sm:flex-row justify-between gap-4 sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              <h2
                className="text-lg font-bold truncate max-w-40 lg:max-w-92 xl:max-w-128"
                title={tournament.name}
              >
                {tournament.name}
              </h2>
              <TournamentStatusBadge status={tournament.status} />
            </div>

            <div className="flex gap-2 items-center ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {tournament.status.tag === "Planning" && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setIsUpdateStatusOpen(true)}
                      >
                        Announce tournament
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => setIsEditingOpen(true)}>
                    Edit tournament
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {tournament.status.tag === "Planning" && (
                <ConfirmModal
                  isOpen={isUpdateStatusOpen}
                  onClose={() => setIsUpdateStatusOpen(false)}
                  variant="default"
                  title="Announce Tournament"
                  description="Are you sure you want to announce this tournament? This will make it available to the public. This action cannot be undone."
                  confirmText="Announce"
                  cancelText="Cancel"
                  onConfirm={handleUpdateStatus}
                />
              )}

              <Modal isOpen={isEditingOpen} setIsOpen={setIsEditingOpen}>
                <EditTournamentModal data={tournament} />
              </Modal>
            </div>
          </div>

          <div className="flex flex-col">
            {(tournament.startingAt || tournament.endingAt) && (
              <div
                className="flex gap-2 items-center text-muted-foreground text-sm"
                title={`
                ${tournament.startingAt ? tournament.startingAt.toDate().toLocaleString() : "N/A"} - ${tournament.endingAt ? tournament.endingAt.toDate().toLocaleString() : "N/A"}
              `}
              >
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

        {tournament.description && (
          <>
            <Separator />

            <div className="flex flex-col gap-1 text-sm">
              <p className="text-muted-foreground">{tournament.description}</p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
