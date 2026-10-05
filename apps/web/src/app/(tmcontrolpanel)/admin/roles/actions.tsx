"use client";

import Modal from "@/components/modals/modal";
import AddRoleModal from "@/components/modals/roles/add-role";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

export const createActions = (refetch: () => void) => {
  return (
    <Modal closeOnBackdropClick={false}>
      <AddRoleModal onSubmit={refetch} />
      <Button collapse="sm">
        <IconPlus />
        Add Role
      </Button>
    </Modal>
  );
};
