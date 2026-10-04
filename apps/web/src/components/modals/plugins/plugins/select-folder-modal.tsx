"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SelectFolderForm from "@/forms/server/plugins/match/select-folder";
import { LocalMapInfo } from "@/types/map";
import { DefaultModalProps } from "../../default-props";

export default function SelectFolderModal({
  data,
  closeModal,
  onSubmit,
}: DefaultModalProps<Record<string, LocalMapInfo[]>, LocalMapInfo[]>) {
  if (!data) {
    return null;
  }

  const handleSubmit = (maps: LocalMapInfo[]) => {
    closeModal?.();
    onSubmit?.(maps);
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Select Folder</DialogTitle>
      </DialogHeader>

      <SelectFolderForm localFolders={data} onSubmit={handleSubmit} />
    </ModalContent>
  );
}
