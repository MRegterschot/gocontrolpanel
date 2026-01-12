"use client";

import ConfirmModal from "@/components/modals/confirm-modal";
import Modal from "@/components/modals/modal";
import CreateCompetitionModal from "@/components/modals/tournaments/competition/create-competition";
import EditCompetitionModal from "@/components/modals/tournaments/competition/edit-competition";
import EditRegistrationSettingsModal from "@/components/modals/tournaments/competition/edit-registration-settings";
import CreateMatchModal from "@/components/modals/tournaments/match/create-match";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { reducers, tables } from "@/lib/tourney-manager";
import { getErrorMessage } from "@/lib/utils";
import { IconCalendar } from "@tabler/icons-react";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Uuid } from "spacetimedb";
import { eq, useReducer, useTable, where } from "spacetimedb/react";
import CompetitionStatusBadge from "../status/competition-status-badge";
import RegistrationBadge from "./registration-badge";

export default function CompetitionInfo({
  competitionId,
}: {
  competitionId: number;
}) {
  const { data: session } = useSession();

  const register = useReducer(reducers.registerPlayer);
  const unregister = useReducer(reducers.unregisterPlayer);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditCompetitionOpen, setIsEditCompetitionOpen] = useState(false);
  const [isEditRegistrationSettingsOpen, setIsEditRegistrationSettingsOpen] =
    useState(false);
  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);

  const [competitionRows] = useTable(
    tables.competition,
    where(eq("id", competitionId)),
  );

  const competition = competitionRows[0];

  const [registeredPlayerRows] = useTable(
    tables.registeredPlayer,
    where(eq("competitionId", competitionId)),
  );

  if (!competition) {
    return <span>Competition not found</span>;
  }

  const isRegistered = registeredPlayerRows.some(
    (rp) =>
      rp.accountId.compareTo(
        Uuid.parse("3467014a-c1cc-4aae-99fe-6beb5eca232a"), //session?.user.id
      ) === 0,
  );

  const handleRegisterToggle = () => {
    if (!session?.user.id) {
      toast.error("You must be logged in to register");
      return;
    }

    if (competition.registrationSettings.tag === "None") {
      toast.error("Registration is not open for this competition");
      return;
    }

    try {
      if (isRegistered) {
        unregister({
          competitionId: competition.id,
        });
        toast.success("Unregistered successfully");
      } else {
        register({
          competitionId: competition.id,
        });
        toast.success("Registered successfully");
      }
    } catch (error) {
      toast.error("Failed to update registration", {
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
                title={competition.name}
              >
                {competition.name}
              </h2>
              <CompetitionStatusBadge status={competition.status} />
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
                  {competition.registrationSettings.tag !== "None" && (
                    <>
                      <DropdownMenuItem onClick={() => setIsRegisterOpen(true)}>
                        {isRegistered ? "Unregister" : "Register"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => setIsEditCompetitionOpen(true)}
                  >
                    Edit stage
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsEditRegistrationSettingsOpen(true)}
                  >
                    Edit registration settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsAddMatchOpen(true)}>
                    Add match
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setIsAddStageOpen(true)}>
                    Add stage
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ConfirmModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                variant={isRegistered ? "destructive" : "default"}
                onConfirm={handleRegisterToggle}
                title={
                  isRegistered
                    ? "Unregister from competition"
                    : "Register for competition"
                }
                description={
                  isRegistered
                    ? `Are you sure you want to unregister from ${competition.name}?`
                    : `Do you want to register for ${competition.name}?`
                }
                confirmText={isRegistered ? "Unregister" : "Register"}
                cancelText="Cancel"
              />

              <Modal
                isOpen={isEditCompetitionOpen}
                setIsOpen={setIsEditCompetitionOpen}
              >
                <EditCompetitionModal data={competition} />
              </Modal>

              <Modal
                isOpen={isEditRegistrationSettingsOpen}
                setIsOpen={setIsEditRegistrationSettingsOpen}
              >
                <EditRegistrationSettingsModal
                  data={{
                    competitionId: competition.id,
                    registrationSettings: competition.registrationSettings,
                  }}
                />
              </Modal>

              <Modal isOpen={isAddMatchOpen} setIsOpen={setIsAddMatchOpen}>
                <CreateMatchModal data={competition.id} />
              </Modal>

              <Modal isOpen={isAddStageOpen} setIsOpen={setIsAddStageOpen}>
                <CreateCompetitionModal data={competition.id} />
              </Modal>
            </div>
          </div>

          <div className="flex flex-col">
            {(competition.startingAt || competition.endingAt) && (
              <div
                className="flex gap-2 items-center text-muted-foreground text-sm"
                title={`
                ${competition.startingAt ? competition.startingAt.toDate().toLocaleString() : "N/A"} - ${competition.endingAt ? competition.endingAt.toDate().toLocaleString() : "N/A"}
              `}
              >
                <IconCalendar size={16} />

                {competition.startingAt && (
                  <span>
                    {competition.startingAt
                      .toDate()
                      .toLocaleDateString("en-UK", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                  </span>
                )}

                {competition.startingAt && competition.endingAt && (
                  <span>-</span>
                )}

                {competition.endingAt && (
                  <span>
                    {competition.endingAt.toDate().toLocaleDateString("en-UK", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            )}

            <div className="space-x-2 sm:mt-1">
              <RegistrationBadge
                registrationSettings={competition.registrationSettings}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
