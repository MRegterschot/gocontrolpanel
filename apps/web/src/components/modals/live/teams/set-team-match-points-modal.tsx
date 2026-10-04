"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SetTeamMatchPointsForm from "@/forms/server/live/teams/set-team-match-points-form";
import { Team } from "@tmcp/shared";
import { DefaultModalProps } from "../../default-props";

export default function SetTeamMatchPointsModal({
  closeModal,
  data,
  serverId,
}: DefaultModalProps<Record<number, Team>>) {
  if (!data || !serverId) return null;

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Set Match Points</DialogTitle>
      </DialogHeader>
      <SetTeamMatchPointsForm
        serverId={serverId}
        teams={data}
        callback={closeModal}
      />
    </ModalContent>
  );
}
