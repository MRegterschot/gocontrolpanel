"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditProjectForm from "@/forms/admin/hetzner/edit-project-form";
import type { HetznerProjectsWithUsers } from "@/services/database/hetzner-projects";
import { DefaultModalProps } from "../default-props";

export default function EditProjectModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<HetznerProjectsWithUsers>) {
  if (!data) return null;

  const handleCallback = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Edit {data.name}</DialogTitle>
      </DialogHeader>
      <EditProjectForm project={data} callback={handleCallback} />
    </ModalContent>
  );
}
