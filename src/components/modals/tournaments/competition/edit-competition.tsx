"use client";
import { Card } from "@/components/ui/card";
import EditCompetitionForm from "@/forms/tournaments/competition/edit-competition-form";
import { CompetitionV1 } from "@/lib/tourney-manager";
import { IconX } from "@tabler/icons-react";
import { Infer } from "spacetimedb";
import { DefaultModalProps } from "../../default-props";

export default function EditCompetitionModal({
  data,
  closeModal,
}: DefaultModalProps<Infer<typeof CompetitionV1>>) {
  if (!data) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Edit Stage</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <EditCompetitionForm competition={data} callback={closeModal} />
    </Card>
  );
}
