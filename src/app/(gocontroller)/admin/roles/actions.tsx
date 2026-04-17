"use client";

import Modal from "@/components/modals/modal";
import AddRoleModal from "@/components/modals/roles/add-role";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

export const createActions = (refetch: () => void) => {
  return (
    <Modal closeOnBackdropClick={false}>
      <AddRoleModal onSubmit={refetch} />
      <Button className="w-9 sm:w-auto">
        <IconPlus />
        <span className="hidden sm:inline">Add Role</span>
      </Button>
    </Modal>
  );
};
