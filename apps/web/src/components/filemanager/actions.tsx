"use client";
import { deleteEntry } from "@/actions/filemanager";
import { getErrorMessage, removePrefix } from "@/lib/utils";
import { FileEntry } from "@/types/filemanager";
import { ServerError } from "@/types/responses";
import {
  IconArrowsMove,
  IconDownload,
  IconFilePlus,
  IconFolderPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "../modals/confirm-modal";
import CreateFileEntryModal from "../modals/files/create-file-entry";
import MoveFileEntriesModal from "../modals/files/move-file-entries";
import Modal from "../modals/modal";
import { Button } from "../ui/button";

interface ActionsProps {
  selectedItems: FileEntry[];
  setSelectedItems: Dispatch<SetStateAction<FileEntry[]>>;
  setFolders: Dispatch<SetStateAction<FileEntry[]>>;
  setFiles: Dispatch<SetStateAction<FileEntry[]>>;
  serverId: string;
  path: string;
  uploadFilesCallback: (files: FileList | null) => void;
}

export default function Actions({
  selectedItems,
  setSelectedItems,
  setFolders,
  setFiles,
  serverId,
  path,
  uploadFilesCallback,
}: ActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    uploadFilesCallback(files);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const parentOf = (entryPath: string) =>
    entryPath.slice(0, entryPath.lastIndexOf("/")) || "/";

  // Moved items only stay visible if they are still in this folder
  const handleMoved = (moved: FileEntry[] = []) => {
    const oldPaths = selectedItems.map((item) => item.path);
    const here = moved.filter(
      (entry) =>
        parentOf(entry.path) === parentOf(`${path.replace(/\/+$/, "")}/x`),
    );
    const withoutMoved = (prev: FileEntry[]) =>
      prev.filter((entry) => !oldPaths.includes(entry.path));

    setFolders((prev) => [
      ...withoutMoved(prev),
      ...here.filter((entry) => entry.isDir),
    ]);
    setFiles((prev) => [
      ...withoutMoved(prev),
      ...here.filter((entry) => !entry.isDir),
    ]);
    setSelectedItems([]);
  };

  // A plain navigation lets the browser stream the file or zip to disk
  const handleDownload = () => {
    const query = new URLSearchParams(
      selectedItems.map((item) => ["path", item.path]),
    );
    const link = document.createElement("a");
    link.href = `/api/servers/${encodeURIComponent(serverId)}/files/download?${query}`;
    link.download = "";
    link.click();
  };

  const handleDelete = async () => {
    if (selectedItems.length === 0) return;

    try {
      const pathsToDelete = selectedItems.map((item) => item.path);
      const { error } = await deleteEntry(serverId, pathsToDelete);

      if (error) {
        throw new ServerError(error, "DeleteEntryError");
      }

      setFolders((prev) =>
        prev.filter((folder) => !pathsToDelete.includes(folder.path)),
      );

      setFiles((prev) =>
        prev.filter((file) => !pathsToDelete.includes(file.path)),
      );

      toast.success("Items deleted", {
        description: `${selectedItems.length} item(s) successfully deleted.`,
      });

      setSelectedItems([]);
    } catch (error) {
      toast.error("Failed to delete items", {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      {selectedItems.length > 0 && (
        <>
          <Button variant="outline" collapse="sm" onClick={handleDownload}>
            <IconDownload />
            Download
          </Button>

          <Modal closeOnBackdropClick={false} key={selectedItems.length}>
            <MoveFileEntriesModal
              serverId={serverId}
              items={selectedItems}
              onSubmit={handleMoved}
            />
            <Button variant="outline" collapse="sm">
              <IconArrowsMove />
              {selectedItems.length === 1 ? "Move / Rename" : "Move"}
            </Button>
          </Modal>

          <Button
            variant="destructive"
            collapse="sm"
            onClick={() => setIsDeleting(true)}
          >
            <IconTrash />
            Delete
          </Button>

          <ConfirmModal
            isOpen={isDeleting}
            onConfirm={handleDelete}
            onClose={() => setIsDeleting(false)}
            title="Delete items"
            description={`Are you sure you want to delete ${selectedItems.length} item(s)?`}
            confirmText="Delete"
            cancelText="Cancel"
          />
        </>
      )}

      <Modal closeOnBackdropClick={false}>
        <CreateFileEntryModal
          path={removePrefix(path, "/UserData")}
          serverId={serverId}
          isDir={true}
          onSubmit={(fileEntry?: FileEntry) => {
            if (!fileEntry) return;
            setFolders((prev) => [...prev, fileEntry]);
          }}
        />
        <Button variant={"outline"} collapse="sm">
          <IconFolderPlus />
          Create Folder
        </Button>
      </Modal>

      <Modal closeOnBackdropClick={false}>
        <CreateFileEntryModal
          path={removePrefix(path, "/UserData")}
          serverId={serverId}
          isDir={false}
          onSubmit={(fileEntry?: FileEntry) => {
            if (!fileEntry) return;
            setFiles((prev) => [...prev, fileEntry]);
          }}
        />
        <Button variant={"outline"} collapse="sm">
          <IconFilePlus />
          Create File
        </Button>
      </Modal>

      <Button onClick={triggerUpload} collapse="sm">
        <IconUpload />
        Upload
      </Button>

      <input
        ref={fileInputRef}
        multiple
        type="file"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}
