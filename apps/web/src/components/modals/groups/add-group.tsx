"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddGroupForm from "@/forms/admin/group/add-group-form";
import { useSession } from "next-auth/react";
import { DefaultModalProps } from "../default-props";

export default function AddGroupModal({
  closeModal,
  onSubmit,
}: DefaultModalProps) {
  const { update } = useSession();

  const handleCallback = () => {
    onSubmit?.();
    closeModal?.();
    update();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Add Group</DialogTitle>
      </DialogHeader>
      <AddGroupForm callback={handleCallback} />
    </ModalContent>
  );
}
