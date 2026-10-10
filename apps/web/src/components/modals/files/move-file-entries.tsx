"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MoveFileEntriesForm from "@/forms/server/files/move-file-entries-form";
import { FileEntry } from "@/types/filemanager";
import { DefaultModalProps } from "../default-props";

export default function MoveFileEntriesModal({
  serverId,
  items,
  closeModal,
  onSubmit,
}: {
  serverId: string;
  items: FileEntry[];
} & DefaultModalProps<void, FileEntry[]>) {
  const handleSubmit = (moved: FileEntry[]) => {
    onSubmit?.(moved);
    closeModal?.();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>
          {items.length === 1 ? "Move / Rename" : "Move Items"}
        </DialogTitle>
      </DialogHeader>

      <MoveFileEntriesForm
        serverId={serverId}
        items={items}
        callback={handleSubmit}
      />
    </ModalContent>
  );
}
