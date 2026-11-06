"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddProjectForm from "@/forms/admin/hetzner/add-project-form";
import { DefaultModalProps } from "../default-props";

export default function AddProjectModal({
  closeModal,
  onSubmit,
}: DefaultModalProps) {
  const handleCallback = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Add Project</DialogTitle>
      </DialogHeader>
      <AddProjectForm callback={handleCallback} />
    </ModalContent>
  );
}
