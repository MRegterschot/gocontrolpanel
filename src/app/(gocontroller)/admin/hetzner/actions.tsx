"use client";

import Modal from "@/components/modals/modal";
import AddProjectModal from "@/components/modals/projects/add-project";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

export const createActions = (refetch: () => void) => {
  return (
    <Modal closeOnBackdropClick={false}>
      <AddProjectModal onSubmit={refetch} />
      <Button className="w-9 sm:w-auto">
        <IconPlus />
        <span className="hidden sm:inline">Add Project</span>
      </Button>
    </Modal>
  );
};
