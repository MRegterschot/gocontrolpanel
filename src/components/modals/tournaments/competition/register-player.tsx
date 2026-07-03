"use client";
import { Card } from "@/components/ui/card";
import RegisterPlayerForm from "@/forms/tournaments/competition/register-player-form";
import { IconX } from "@tabler/icons-react";
import { DefaultModalProps } from "../../default-props";

export default function RegisterPlayerModal({
  data,
  closeModal,
}: DefaultModalProps<{
  registrationId: number;
}>) {
  if (!data) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-100 max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Register Player</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <RegisterPlayerForm
        registrationId={data.registrationId}
        callback={closeModal}
      />
    </Card>
  );
}
