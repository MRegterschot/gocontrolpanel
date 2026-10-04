"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditUserForm from "@/forms/admin/user/edit-user-form";
import { Users } from "@gcp/db";
import { DefaultModalProps } from "../default-props";

export default function EditUserModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<Users>) {
  if (!data) return null;

  const handleCallback = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Edit {data.nickName}</DialogTitle>
      </DialogHeader>
      <EditUserForm user={data} callback={handleCallback} />
    </ModalContent>
  );
}
