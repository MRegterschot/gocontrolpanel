"use client";

import { Card } from "@/components/ui/card";
import SelectFolderForm from "@/forms/server/plugins/match/select-folder";
import { LocalMapInfo } from "@/types/map";
import { IconX } from "@tabler/icons-react";
import { DefaultModalProps } from "../../default-props";

export default function SelectFolderModal({
  data,
  closeModal,
  onSubmit,
}: DefaultModalProps<Record<string, LocalMapInfo[]>, LocalMapInfo[]>) {
  if (!data) {
    return null;
  }

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSubmit = (maps: LocalMapInfo[]) => {
    closeModal?.();
    onSubmit?.(maps);
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-100 max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Select Folder</h1>

        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground ml-2"
          onClick={closeModal}
        />
      </div>

      <SelectFolderForm localFolders={data} onSubmit={handleSubmit} />
    </Card>
  );
}
