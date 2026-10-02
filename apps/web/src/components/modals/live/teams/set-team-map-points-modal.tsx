"use client";
import { Card } from "@/components/ui/card";
import SetTeamMapPointsForm from "@/forms/server/live/teams/set-team-map-points-form";
import { Team } from "@/types/live";
import { IconX } from "@tabler/icons-react";
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

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Set Team Map Points</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>
      <SetTeamMapPointsForm
        serverId={serverId}
        teams={data.teams}
        type={data.type}
        callback={closeModal}
      />
    </Card>
  );
}
