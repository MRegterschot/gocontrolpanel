"use client";

import AddGroupModal from "@/components/modals/groups/add-group";
import Modal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

export const createActions = (refetch: () => void) => {
  return (
    <Modal closeOnBackdropClick={false}>
      <AddGroupModal onSubmit={refetch} />
      <Button collapse="sm">
        <IconPlus />
        Add Group
      </Button>
    </Modal>
  );
};
