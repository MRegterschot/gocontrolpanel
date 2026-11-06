"use client";

import { ModalContent } from "@/components/modals/modal";
import { TmText } from "@/components/tm-text";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditUserForm from "@/forms/admin/user/edit-user-form";
import { Users } from "@tmcontrolpanel/db";
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
        <DialogTitle>
          Edit <TmText text={data.nickName} />
        </DialogTitle>
      </DialogHeader>
      <EditUserForm user={data} callback={handleCallback} />
    </ModalContent>
  );
}
