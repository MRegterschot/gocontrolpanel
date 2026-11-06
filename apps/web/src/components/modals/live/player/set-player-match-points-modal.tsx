"use client";

import { ModalContent } from "@/components/modals/modal";
import { TmText } from "@/components/tm-text";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SetPlayerMatchPointsForm from "@/forms/server/live/player/set-player-match-points-form";
import { PlayerRound } from "@tmcontrolpanel/shared";
import { DefaultModalProps } from "../../default-props";

export default function SetPlayerMatchPointsModal({
  closeModal,
  data,
  serverId,
}: DefaultModalProps<PlayerRound>) {
  if (!data || !serverId) return null;

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>
          Set Points for <TmText text={data.name} />
        </DialogTitle>
      </DialogHeader>
      <SetPlayerMatchPointsForm
        serverId={serverId}
        login={data.login}
        points={data.matchPoints}
        callback={closeModal}
      />
    </ModalContent>
  );
}
