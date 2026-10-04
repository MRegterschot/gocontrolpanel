"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SetTeamMapPointsForm from "@/forms/server/live/teams/set-team-map-points-form";
import { Team } from "@gcp/shared";
import { DefaultModalProps } from "../../default-props";

export default function SetTeamMapPointsModal({
  closeModal,
  data,
  serverId,
}: DefaultModalProps<{
  teams: Record<number, Team>;
  type: string;
}>) {
  if (!data || !serverId) return null;

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Set Team Map Points</DialogTitle>
      </DialogHeader>
      <SetTeamMapPointsForm
        serverId={serverId}
        teams={data.teams}
        type={data.type}
        callback={closeModal}
      />
    </ModalContent>
  );
}
