"use client";
import { Card } from "@/components/ui/card";
import EditRegistrationSettingsForm from "@/forms/tournaments/competition/edit-registration-settings-form";
import { RegistrationSettings } from "@/lib/tourney-manager";
import { IconX } from "@tabler/icons-react";
import { Infer } from "spacetimedb";
import { DefaultModalProps } from "../../default-props";

export default function EditRegistrationSettingsModal({
  data,
  closeModal,
}: DefaultModalProps<{
  competitionId: number;
  registrationSettings: Infer<typeof RegistrationSettings>;
}>) {
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
        <h1 className="text-xl font-bold">Edit Registration Settings</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <EditRegistrationSettingsForm
        competitionId={data.competitionId}
        registrationSettings={data.registrationSettings}
        callback={closeModal}
      />
    </Card>
  );
}
