"use client";
import CreateFileEntryForm from "@/forms/server/files/create-file-entry-form";
import { FileEntry } from "@/types/filemanager";
import { IconX } from "@tabler/icons-react";
import { Card } from "../../ui/card";
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
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSubmit = (fileEntry: FileEntry) => {
    onSubmit?.(fileEntry);
    closeModal?.();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {isDir ? "Create Directory" : "Create File"}
        </h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <CreateFileEntryForm
        serverId={serverId}
        path={path}
        isDir={isDir}
        callback={handleSubmit}
      />
    </Card>
  );
}
