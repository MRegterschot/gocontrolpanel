"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CreateFileEntryForm from "@/forms/server/files/create-file-entry-form";
import { FileEntry } from "@/types/filemanager";
import { DefaultModalProps } from "../default-props";

export default function CreateFileEntryModal({
  serverId,
  path,
  isDir = false,
  closeModal,
  onSubmit,
}: {
  serverId: string;
  path: string;
  isDir?: boolean;
} & DefaultModalProps<void, FileEntry>) {
  const handleSubmit = (fileEntry: FileEntry) => {
    onSubmit?.(fileEntry);
    closeModal?.();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>{isDir ? "Create Directory" : "Create File"}</DialogTitle>
      </DialogHeader>

      <CreateFileEntryForm
        serverId={serverId}
        path={path}
        isDir={isDir}
        callback={handleSubmit}
      />
    </ModalContent>
  );
}
