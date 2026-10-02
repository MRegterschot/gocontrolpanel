"use client";
import AddProjectForm from "@/forms/admin/hetzner/add-project-form";
import { IconX } from "@tabler/icons-react";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";

export default function AddProjectModal({
  closeModal,
  onSubmit,
}: DefaultModalProps) {
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCallback = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Add Project</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>
      <AddProjectForm callback={handleCallback} />
    </Card>
  );
}
