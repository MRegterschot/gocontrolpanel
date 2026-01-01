"use client";
import { Card } from "@/components/ui/card";
import CreateMatchTemplateForm from "@/forms/tournaments/match/match-template/create-match-template-form";
import { IconX } from "@tabler/icons-react";
import { DefaultModalProps } from "../../default-props";

export default function CreateMatchTemplateModal({
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
        <h1 className="text-xl font-bold">Create Match Template</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <CreateMatchTemplateForm callback={closeModal} />
    </Card>
  );
}
