"use client";

import Modal from "@/components/modals/modal";
import CreateMatchModal from "@/components/modals/tournaments/match/create-match";
import { Button } from "@/components/ui/button";
import { ComponentProps } from "react";

export default function AddMatchButton({
  competitionId,
  ...props
}: ComponentProps<"button"> & { competitionId: number }) {
  return (
    <Modal>
      <CreateMatchModal data={competitionId} />
      <Button
        variant="outline"
        className="dark:bg-card hover:dark:bg-muted"
        {...props}
      >
        Add Match
      </Button>
    </Modal>
  );
}
