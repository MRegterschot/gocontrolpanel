"use client";

import ConfirmModal from "@/components/modals/confirm-modal";
import Modal from "@/components/modals/modal";
import CreateCompetitionModal from "@/components/modals/tournaments/competition/create-competition";
import EditCompetitionModal from "@/components/modals/tournaments/competition/edit-competition";
import EditRegistrationSettingsModal from "@/components/modals/tournaments/competition/edit-registration-settings";
import CreateMatchModal from "@/components/modals/tournaments/match/create-match";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Competition } from "@/hooks/tournaments/competitions/use-competition";
import { reducers } from "@/lib/server-manager";
import { getErrorMessage } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";

export default function CompetitionActions({
  competition,
}: {
  competition: Competition;
}) {
  const createRegistration = useReducer(reducers.registrationCreate);
  const confirmRegistration = useReducer(reducers.registrationConfigured);
  const startRegistration = useReducer(reducers.registrationStart);
  const endRegistration = useReducer(reducers.registrationEnd);

  const [isEditCompetitionOpen, setIsEditCompetitionOpen] = useState(false);

  const [registrationAction, setRegistrationAction] = useState<
    keyof typeof registrationActions | null
  >(null);
  const [isEnableRegistrationOpen, setIsEnableRegistrationOpen] =
    useState(false);
  const [isEditRegistrationOpen, setIsEditRegistrationOpen] = useState(false);

  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);

  const registrationActions = {
    confirm: {
      canRun: competition.registration?.status.tag === "Configuring",
      title: "Confirm registration",
      description:
        "Are you sure you want to confirm registration for this competition?",
      confirmText: "Confirm registration",
      action: () => confirmRegistration({ id: competition.registration!.id }),
      success: "Registration confirmed successfully",
      error: "Failed to confirm registration",
      variant: "default" as const,
    },
    start: {
      canRun: competition.registration?.status.tag === "Configured",
      title: "Start registration",
      description:
        "Are you sure you want to start registration for this competition?",
      confirmText: "Start registration",
      action: () => startRegistration({ id: competition.registration!.id }),
      success: "Registration started successfully",
      error: "Failed to start registration",
      variant: "default" as const,
    },
    end: {
      canRun: competition.registration?.status.tag === "Ongoing",
      title: "End registration",
      description:
        "Are you sure you want to end registration for this competition?",
      confirmText: "End registration",
      action: () => endRegistration({ id: competition.registration!.id }),
      success: "Registration ended successfully",
      error: "Failed to end registration",
      variant: "destructive" as const,
    },
  };

  const canEditRegistration =
    competition.registration?.status.tag === "Configuring" ||
    competition.registration?.status.tag === "Configured";

  const hasRegistrationItems =
    !competition.registration ||
    registrationActions.confirm.canRun ||
    registrationActions.start.canRun ||
    registrationActions.end.canRun ||
    canEditRegistration;

  const handleEnableRegistration = () => {
    if (competition.registration) {
      toast.error("Registration already enabled for this competition");
      return;
    }

    try {
      createRegistration({
        name: `${competition.name} Registration`,
        parentId: competition.id,
        withTemplate: 0,
      });
      toast.success("Registration enabled successfully");
    } catch (error) {
      toast.error("Failed to enable registration", {
        description: getErrorMessage(error),
      });
    }
  };

  const handleRegistrationAction = (
    action: keyof typeof registrationActions,
  ) => {
    if (!competition.registration) {
      toast.error("Registration not enabled for this competition");
      return;
    }

    const config = registrationActions[action];

    if (!config.canRun) {
      toast.error("Registration cannot be updated");
      return;
    }

    try {
      config.action();
      toast.success(config.success);
    } catch (error) {
      toast.error(config.error, {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditCompetitionOpen(true)}>
            Edit stage
          </DropdownMenuItem>

          {hasRegistrationItems && <DropdownMenuSeparator />}

          {competition.registration ? (
            <>
              {registrationActions.confirm.canRun && (
                <DropdownMenuItem
                  onClick={() => setRegistrationAction("confirm")}
                >
                  Confirm registration
                </DropdownMenuItem>
              )}

              {registrationActions.start.canRun && (
                <DropdownMenuItem
                  onClick={() => setRegistrationAction("start")}
                >
                  Start registration
                </DropdownMenuItem>
              )}

              {registrationActions.end.canRun && (
                <DropdownMenuItem onClick={() => setRegistrationAction("end")}>
                  End registration
                </DropdownMenuItem>
              )}

              {canEditRegistration && (
                <DropdownMenuItem
                  onClick={() => setIsEditRegistrationOpen(true)}
                >
                  Edit registration
                </DropdownMenuItem>
              )}
            </>
          ) : (
            <DropdownMenuItem onClick={() => setIsEnableRegistrationOpen(true)}>
              Enable registration
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setIsAddMatchOpen(true)}>
            Add match
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setIsAddStageOpen(true)}>
            Add stage
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        isOpen={isEditCompetitionOpen}
        setIsOpen={setIsEditCompetitionOpen}
      >
        <EditCompetitionModal data={competition} />
      </Modal>

      {competition.registration ? (
        <>
          {registrationAction && (
            <ConfirmModal
              isOpen
              onClose={() => setRegistrationAction(null)}
              onConfirm={() => {
                handleRegistrationAction(registrationAction);
                setRegistrationAction(null);
              }}
              variant={registrationActions[registrationAction].variant}
              title={registrationActions[registrationAction].title}
              description={registrationActions[registrationAction].description}
              confirmText={registrationActions[registrationAction].confirmText}
              cancelText="Cancel"
            />
          )}

          {canEditRegistration && (
            <Modal
              isOpen={isEditRegistrationOpen}
              setIsOpen={setIsEditRegistrationOpen}
            >
              <EditRegistrationSettingsModal
                data={{
                  registrationId: competition.registration?.id,
                  registrationSettings: competition.registration?.settings,
                }}
              />
            </Modal>
          )}
        </>
      ) : (
        <ConfirmModal
          isOpen={isEnableRegistrationOpen}
          onClose={() => setIsEnableRegistrationOpen(false)}
          onConfirm={handleEnableRegistration}
          variant="default"
          title="Enable registration for this competition"
          description="Are you sure you want to enable registration for this competition?"
          confirmText="Enable registration"
          cancelText="Cancel"
        />
      )}

      <Modal isOpen={isAddMatchOpen} setIsOpen={setIsAddMatchOpen}>
        <CreateMatchModal data={competition.id} />
      </Modal>

      <Modal isOpen={isAddStageOpen} setIsOpen={setIsAddStageOpen}>
        <CreateCompetitionModal data={competition.id} />
      </Modal>
    </>
  );
}
