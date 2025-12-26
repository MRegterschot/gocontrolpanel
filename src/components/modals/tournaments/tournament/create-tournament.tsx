"use client";
import { Card } from "@/components/ui/card";
import CreateTournamentForm from "@/forms/tournaments/tournament/create-tournament-form";
import { IconX } from "@tabler/icons-react";
import { DefaultModalProps } from "../../default-props";

export default function CreateTournamentModal({
  closeModal,
}: DefaultModalProps) {
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Create Tournament</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <CreateTournamentForm callback={closeModal} />
    </Card>
  );
}
