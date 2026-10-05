"use client";
import { Card } from "@/components/ui/card";
import { cn, formatTimeToAgo, generatePath } from "@/lib/utils";
import { routes } from "@/routes";
import { FileEntry } from "@/types/filemanager";
import { IconFolder } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import React from "react";

export default function FolderCard({
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
      `${generatePath(routes.servers.files, { id: serverId })}?path=${fileEntry.path}`,
    );
  };

  return (
    <Card
      className={cn(
        "flex w-full flex-row p-2 gap-2 items-center cursor-pointer select-none transition-colors hover:bg-accent/50",
        active && "border-primary",
      )}
      onDoubleClick={handleDoubleClick}
      onClick={onClick}
    >
      <IconFolder size={48} className="min-w-12" />
      <div className="flex flex-col min-w-0">
        <h1 className="text-md font-bold truncate">{fileEntry.name}</h1>
        <p className="text-sm text-muted-foreground" suppressHydrationWarning>
          {fileEntry.lastModified
            ? formatTimeToAgo(fileEntry.lastModified)
            : "No last modified date"}
        </p>
      </div>
    </Card>
  );
}
