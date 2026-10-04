"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditGroupForm from "@/forms/admin/group/edit-group-form";
import type { GroupsWithUsersWithServers } from "@/services/database/groups";
import { useSession } from "next-auth/react";
import { DefaultModalProps } from "../default-props";

export default function EditGroupModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<GroupsWithUsersWithServers>) {
  const { update } = useSession();

  if (!data) return null;

  const handleCallback = () => {
    onSubmit?.();
    closeModal?.();
    update();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Edit {data.name}</DialogTitle>
      </DialogHeader>
      <EditGroupForm group={data} callback={handleCallback} />
    </ModalContent>
  );
}
