"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddRoleForm from "@/forms/admin/role/add-role-form";
import { DefaultModalProps } from "../default-props";

export default function AddRoleModal({
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
        <DialogTitle>Add Role</DialogTitle>
      </DialogHeader>
      <AddRoleForm callback={handleCallback} />
    </ModalContent>
  );
}
