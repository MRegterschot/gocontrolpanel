"use client";
import { cn, formatBytes, formatTimeToAgo, generatePath } from "@/lib/utils";
import { routes } from "@/routes";
import { FileEntry } from "@/types/filemanager";
import { IconFile } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import React from "react";

export default function FileCard({
  fileEntry,
  serverId,
  onClick,
  active,
}: {
  fileEntry: FileEntry;
  serverId: string;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
}) {
  const router = useRouter();

  const handleDoubleClick = () => {
    router.push(
      `${generatePath(routes.servers.editor, { id: serverId })}?path=${fileEntry.path}`,
    );
  };

  return (
    <div
      className={cn(
        "flex w-full p-2 gap-2 border rounded-lg items-center cursor-pointer select-none",
        active && "border-primary",
      )}
      onDoubleClick={handleDoubleClick}
      onClick={onClick}
    >
      <IconFile size={48} className="min-w-12" />
      <div className="flex flex-col min-w-0">
        <h1 className="text-md font-bold truncate">{fileEntry.name}</h1>
        <p className="text-sm text-muted-foreground">
          {formatBytes(fileEntry.size || 0, 2)}
        </p>
        <p className="text-sm text-muted-foreground" suppressHydrationWarning>
          {fileEntry.lastModified
            ? formatTimeToAgo(fileEntry.lastModified)
            : "No last modified date"}
        </p>
      </div>
    </div>
  );
}
