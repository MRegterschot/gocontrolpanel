"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditRoleForm from "@/forms/admin/role/edit-role-form";
import { Roles } from "@gcp/db";
import { DefaultModalProps } from "../default-props";

export default function EditRoleModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<Roles>) {
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
      <EditRoleForm role={data} callback={handleCallback} />
    </ModalContent>
  );
}
