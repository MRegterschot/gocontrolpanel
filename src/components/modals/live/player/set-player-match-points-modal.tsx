"use client";
import { Card } from "@/components/ui/card";
import SetPlayerMatchPointsForm from "@/forms/server/live/player/set-player-match-points-form";
import { PlayerRound } from "@/types/live";
import { IconX } from "@tabler/icons-react";
import { DefaultModalProps } from "../../default-props";

export default function SetPlayerMatchPointsModal({
  closeModal,
  data,
  serverId,
}: DefaultModalProps<PlayerRound>) {
  if (!data || !serverId) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Set Points for {data.name}</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>
      <SetPlayerMatchPointsForm
        serverId={serverId}
        login={data.login}
        points={data.matchPoints}
        callback={closeModal}
      />
    </Card>
  );
}
